import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum AnalyticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom',
  ALL = 'all',
}

export enum SalesPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum GroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class AnalyticsQueryDto {
  @IsEnum(AnalyticsPeriod)
  @IsOptional()
  period: AnalyticsPeriod = AnalyticsPeriod.MONTH;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsEnum(GroupBy)
  @IsOptional()
  groupBy: GroupBy = GroupBy.DAY;
}

export class TopBooksQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsEnum(AnalyticsPeriod)
  @IsOptional()
  period: AnalyticsPeriod = AnalyticsPeriod.ALL;
}

export class SalesPeriodQueryDto {
  @IsEnum(SalesPeriod)
  period!: SalesPeriod;

  @IsString()
  @IsOptional()
  date?: string;
}

export class CustomerInsightsQueryDto {
  @IsEnum(AnalyticsPeriod)
  @IsOptional()
  period: AnalyticsPeriod = AnalyticsPeriod.MONTH;
}
