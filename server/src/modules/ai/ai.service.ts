import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, stepCountIs, tool, type ModelMessage } from 'ai';
import { z } from 'zod';
import type { AuthUser } from '../../common/types/auth.types.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { PetsService } from '../pets/pets.service.js';
import { ServicesService } from '../services/services.service.js';
import { ShopSettingsService } from '../shop-settings/shop-settings.service.js';
import { AiRepository } from './ai.repository.js';

const FRONTEND_URL = () => process.env.FRONTEND_URL ?? 'http://localhost:3000';

/**
 * Booking assistant (docs/DESIGN.md). AI is the intent/explanation layer ONLY:
 * it reads services, availability, rules, and the user's pets through the
 * deterministic services, then answers in plain language and points to /book.
 * It NEVER creates or changes bookings — those stay server-authoritative.
 *
 * Model runs through OpenRouter on a FREE model (OPENROUTER_MODEL). Without
 * OPENROUTER_API_KEY the endpoint reports "unavailable" rather than crashing.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly servicesService: ServicesService,
    private readonly availabilityService: AvailabilityService,
    private readonly shopSettingsService: ShopSettingsService,
    private readonly petsService: PetsService,
    private readonly aiRepository: AiRepository,
  ) {}

  get isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  /**
   * Answer one chat turn. `messages` is the running conversation from the
   * client; the exchange is persisted to a ChatSession (proof/audit) and the
   * session id is returned so the client can keep threading.
   */
  async chat(
    user: AuthUser,
    messages: ModelMessage[],
    sessionId: string | undefined,
  ): Promise<{ reply: string; sessionId: string }> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException('AI assistant is not configured (missing OPENROUTER_API_KEY).');
    }

    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! });
    const model = process.env.OPENROUTER_MODEL ?? 'nvidia/nemotron-3-super-120b-a12b:free';

    let reply: string;
    try {
      const result = await generateText({
        model: openrouter.chat(model),
        system: this.systemPrompt(),
        messages,
        tools: this.tools(user),
        // Allow a few tool round-trips (look up data, then answer)
        stopWhen: stepCountIs(6),
      });
      reply = this.clean(result.text);
      if (!reply) {
        // Small free models sometimes end a turn on a tool call with no prose.
        // If they already built a booking link, surface it; otherwise steer
        // the customer forward instead of dead-ending.
        const link = this.extractBookingLink(result.steps);
        reply = link
          ? `Here's your pre-filled booking link — open it to confirm on the Book page: ${link}`
          : 'Tell me the service, which of your pets, and the day, and I\'ll put together a booking link for you.';
      }
    } catch (error) {
      this.logger.error(`AI chat failed: ${String(error)}`);
      throw new ServiceUnavailableException('The assistant is temporarily unavailable. Please try again.');
    }

    // Persist the exchange (best-effort — never fail the reply on a write error)
    const resolvedSession = await this.aiRepository.resolveSession(user.id, sessionId).catch(() => null);
    if (resolvedSession) {
      const lastUser = [...messages].reverse().find((message) => message.role === 'user');
      const userText = typeof lastUser?.content === 'string' ? lastUser.content : '';
      await this.aiRepository
        .appendMessages(resolvedSession, [
          ...(userText ? [{ role: 'user', content: userText }] : []),
          { role: 'assistant', content: reply },
        ])
        .catch((error: unknown) => this.logger.error(`Chat persist failed: ${String(error)}`));
    }

    return { reply, sessionId: resolvedSession ?? (sessionId ?? '') };
  }

  /** Find a booking URL the model built via create_booking_link across all tool steps. */
  private extractBookingLink(steps: Awaited<ReturnType<typeof generateText>>['steps']): string | null {
    for (const step of steps) {
      for (const toolResult of step.toolResults) {
        if (toolResult.toolName === 'create_booking_link') {
          const output = toolResult.output as { url?: string } | undefined;
          if (output?.url) return output.url;
        }
      }
    }
    return null;
  }

  /** Strip chat-template leakage some small models append (e.g. "</assistant>", "<|...|>", trailing "]}"). */
  private clean(text: string): string {
    return text
      .replace(/<\|[^|]*\|>/g, '')
      .replace(/<\/?(assistant|user|system)>/gi, '')
      .replace(/[\]}]+\s*$/g, '')
      .trim();
  }

  private systemPrompt(): string {
    const today = new Date().toISOString().slice(0, 10);
    return [
      'You are the friendly booking assistant for a single pet grooming shop.',
      `Today is ${today} (use this to resolve "Friday", "tomorrow", etc.).`,
      '',
      'RULES — follow exactly:',
      '- Always use the tools for real data. Never invent prices, hours, availability, or pet names.',
      '- Pet names: ONLY use names returned by get_my_pets. If the customer mentions a pet you do not find in get_my_pets, say you do not see that pet and list the pets they do have. Never make up a pet named "Lucy" or similar.',
      '- Prices depend on the pet size band (derived from weight). Use get_my_pets to get a pet size, or ask for the weight.',
      '- Show open times as clean 12-hour clock times separated by commas, e.g. "12:00 PM, 12:30 PM, 1:00 PM". Never paste raw ISO timestamps or JSON.',
      '- You CANNOT make, change, or cancel bookings. Bookings are always confirmed on the Book page.',
      '- When the customer has picked a service AND a pet AND a day (and ideally a time), call create_booking_link and give them the exact link so their choices are pre-filled on the Book page. Phrase it like: "Open the Book page here: <link>".',
      '- Write in plain, warm sentences. No code, no JSON, no XML/template tags in your answer.',
      '- Reply in the same language the customer writes in (Thai or English).',
    ].join('\n');
  }

  private tools(user: AuthUser) {
    return {
      list_services: tool({
        description: 'List the grooming services with their price tiers (price and duration per pet size band).',
        inputSchema: z.object({}),
        execute: async () => {
          const services = await this.servicesService.findAll();
          return services.map((service) => ({
            id: service.id,
            name: service.name,
            description: service.description,
            tiers: service.tiers.map((tier) => ({
              sizeId: tier.sizeId,
              priceThb: tier.priceThb,
              durationMin: tier.durationMin,
            })),
          }));
        },
      }),

      get_booking_rules: tool({
        description: 'Get the shop opening hours, timezone, minimum notice, and cancellation cutoff.',
        inputSchema: z.object({}),
        execute: () => this.shopSettingsService.bookingRules(),
      }),

      get_my_pets: tool({
        description: "List the signed-in customer's pets with their derived size band id and weight.",
        inputSchema: z.object({}),
        execute: async () => {
          const pets = await this.petsService.findAll(user);
          return pets.map((pet) => ({ id: pet.id, name: pet.name, breed: pet.breed, weightKg: pet.weightKg, sizeId: pet.sizeId }));
        },
      }),

      check_availability: tool({
        description:
          'Check open time slots for a service on a date for a given pet size band. Returns start times (ISO) and how many groomers are free.',
        inputSchema: z.object({
          serviceId: z.string().describe('Service id from list_services'),
          sizeId: z.number().int().describe('Pet size band id from get_my_pets'),
          date: z.string().describe('Day to check, YYYY-MM-DD'),
        }),
        execute: async ({ serviceId, sizeId, date }) => {
          const availability = await this.availabilityService.getAvailability({ serviceId, sizeId, date });
          return {
            date: availability.date,
            durationMin: availability.durationMin,
            openSlots: availability.slots.map((slot) => ({ start: slot.start, groomersFree: slot.staffIds.length })),
          };
        },
      }),

      create_booking_link: tool({
        description:
          'Build a deep link to the Book page with the chosen service, pet, date and time pre-filled. Call this once the customer has picked what they want, then show them the link.',
        inputSchema: z.object({
          serviceId: z.string().describe('Service id from list_services'),
          petId: z.string().describe('Pet id from get_my_pets'),
          date: z.string().optional().describe('Chosen day, YYYY-MM-DD'),
          start: z.string().optional().describe('Chosen slot start as ISO, from check_availability openSlots[].start'),
        }),
        execute: async ({ serviceId, petId, date, start }) => {
          await Promise.resolve();
          const params = new URLSearchParams({ serviceId, petId });
          if (date) params.set('date', date);
          if (start) params.set('start', start);
          return { url: `${FRONTEND_URL()}/book?${params.toString()}` };
        },
      }),
    };
  }
}
