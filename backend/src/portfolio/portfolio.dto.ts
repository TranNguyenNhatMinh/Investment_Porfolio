import { IsEnum, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export enum HoldingType {
  STOCK = 'STOCK',
  CRYPTO = 'CRYPTO',
}

export class CreateHoldingDto {
  @IsEnum(HoldingType)
  type: HoldingType;

  @IsString()
  ticker: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  shares: number;

  @IsNumber()
  @Min(0)
  buyPrice: number;

  @IsNumber()
  @Min(0)
  currentPrice: number;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateHoldingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  shares?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  buyPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentPrice?: number;

  @IsOptional()
  @IsString()
  sector?: string;
}

export class UpsertBudgetDto {
  @IsNumber()
  month: number;

  @IsNumber()
  year: number;

  @IsNumber()
  @Min(0)
  income: number;

  @IsNumber()
  @Min(0)
  stockInvest: number;

  @IsNumber()
  @Min(0)
  cryptoInvest: number;

  @IsNumber()
  @Min(0)
  spending: number;
}
