import { ValueTransformer } from 'typeorm';
import { DateTime } from 'luxon';

export class LuxonTransformer implements ValueTransformer {
    public from(value: Date | null | undefined): DateTime | null | undefined {
        if (value === null) {
            return null;
        }

        if (typeof value === 'undefined') {
            return undefined;
        }

        return DateTime.fromJSDate(value);
    }

    public to(value: DateTime | undefined | null): Date | null | undefined {
        if (value === null) {
            return null;
        }

        if (typeof value === 'undefined') {
            return undefined;
        }

        return value.toJSDate();
    }
}
