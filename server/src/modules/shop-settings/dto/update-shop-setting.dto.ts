import { Allow } from 'class-validator';

export class UpdateShopSettingDto {
  @Allow()
  value!: unknown;
}
