import { IsString, IsNumber, IsBoolean, IsOptional, IsDateString, IsEnum, Min, Max } from 'class-validator';

export enum SavingsTypeEnum {
  BANK = 'BANK',
  MOMO = 'MOMO',
}

export class CreateSavingsDto {
  @IsEnum(SavingsTypeEnum) @IsOptional() savingsType?: SavingsTypeEnum;
  @IsString() bank: string;
  @IsString() name: string;
  @IsNumber() @Min(0) amount: number;
  @IsString() @IsOptional() currency?: string;
  @IsNumber() @Min(0) @Max(100) interestRate: number;
  @IsDateString() @IsOptional() startDate?: string;
  @IsDateString() @IsOptional() maturityDate?: string;
  @IsBoolean() @IsOptional() isRolling?: boolean;
  @IsString() @IsOptional() note?: string;
}

export class UpdateSavingsDto {
  @IsString() @IsOptional() bank?: string;
  @IsString() @IsOptional() name?: string;
  @IsNumber() @Min(0) @IsOptional() amount?: number;
  @IsNumber() @Min(0) @Max(100) @IsOptional() interestRate?: number;
  @IsDateString() @IsOptional() startDate?: string;
  @IsDateString() @IsOptional() maturityDate?: string;
  @IsBoolean() @IsOptional() isRolling?: boolean;
  @IsString() @IsOptional() note?: string;
}
