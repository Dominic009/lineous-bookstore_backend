/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Custom validator to check if discount price is less than or equal to original price
 */
export function IsDiscountLessThanPrice(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDiscountLessThanPrice',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const relatedPropertyName = args.constraints[0] as string;
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];

          if (value === undefined || value === null) {
            return true; // Optional field, skip validation if not provided
          }

          if (typeof value !== 'number' || typeof relatedValue !== 'number') {
            return false;
          }

          return value <= relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const relatedPropertyName = args.constraints[0] as string;
          return `${args.property} must be less than or equal to ${relatedPropertyName}`;
        },
      },
    });
  };
}

/**
 * Custom validator to check if value is non-negative
 */
export function IsNonNegative(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNonNegative',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) {
            return true; // Optional field, skip validation if not provided
          }

          if (typeof value !== 'number') {
            return false;
          }

          return value >= 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a non-negative number`;
        },
      },
    });
  };
}

/**
 * Validation messages for consistent error responses
 */
export const BookValidationMessages = {
  PRICE_REQUIRED: 'Price is required',
  PRICE_NON_NEGATIVE: 'Price must be a non-negative number',
  DISCOUNT_LESS_THAN_PRICE:
    'Discount price must be less than or equal to original price',
  DISCOUNT_NON_NEGATIVE: 'Discount price must be a non-negative number',
  STOCK_AMOUNT_NON_NEGATIVE: 'Stock amount must be a non-negative number',
  ISBN_FORMAT: 'ISBN must be a valid format',
  TITLE_REQUIRED: 'Title is required',
  SLUG_REQUIRED: 'Slug is required',
} as const;

/**
 * Success messages for consistent responses
 */
export const BookSuccessMessages = {
  CREATED: 'Book created successfully',
  UPDATED: 'Book updated successfully',
  DELETED: 'Book deleted successfully',
  RETRIEVED: 'Book retrieved successfully',
  RETRIEVED_ALL: 'Books retrieved successfully',
  NOT_FOUND: 'No books found',
} as const;
