import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, stepCountIs, tool, type ModelMessage } from 'ai';
import { z } from 'zod';
import type { AuthUser } from '../../common/types/auth.types.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { PetsService } from '../pets/pets.service.js';
import { ServicesService } from '../services/services.service.js';
import { ShopSettingsService } from '../shop-settings/shop-settings.service.js';

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
  ) {}

  get isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  /** Answer one chat turn. `messages` is the running conversation from the client. */
  async chat(user: AuthUser, messages: ModelMessage[]): Promise<{ reply: string }> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException('AI assistant is not configured (missing OPENROUTER_API_KEY).');
    }

    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! });
    const model = process.env.OPENROUTER_MODEL ?? 'openai/gpt-oss-20b:free';

    try {
      const result = await generateText({
        model: openrouter.chat(model),
        system: this.systemPrompt(),
        messages,
        tools: this.tools(user),
        // Allow a few tool round-trips (look up data, then answer)
        stopWhen: stepCountIs(6),
      });
      return { reply: this.clean(result.text) || 'Sorry, I could not find an answer. Please try the booking page.' };
    } catch (error) {
      this.logger.error(`AI chat failed: ${String(error)}`);
      throw new ServiceUnavailableException('The assistant is temporarily unavailable. Please try again.');
    }
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
      `Today is ${today}.`,
      'You help customers understand services, prices, opening hours, and when groomers are free.',
      'Always use the tools to get real data — never invent prices, hours, or availability.',
      'Prices depend on the pet size band, which is derived from the pet weight; use get_my_pets to find a pet size, or ask the customer for the pet weight.',
      'You CANNOT make, change, or cancel bookings. When the customer is ready, tell them to open the "Book" page to confirm — bookings are always finished there.',
      'Keep answers short and warm. Reply in the same language the customer writes in (Thai or English).',
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
    };
  }
}
