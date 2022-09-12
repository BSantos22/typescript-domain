import {defaultMetadataStorage} from './metadata-storage';
import {DEBUG_INFO, validateValue} from './validation';
import type {Constructor, DebugFunction, Indexable, PlainData} from './types';

export class Entity<T> {
	public constructor(
		_payload?: PlainData<T> | null,
		private readonly _debugFunction?: DebugFunction,
		private readonly _debugSkipUndef?: boolean
	) {}

	public isValid(): boolean {
		return true;
	}

	private _init(constructor: Constructor<T>, payload?: PlainData<T>): void {
		const entityMetadata = defaultMetadataStorage.getMetadata(constructor);
		if (!entityMetadata) {
			return;
		}

		for (const key of Object.keys(this)) {
			const fieldMetadata = entityMetadata.find(({field}) => field === key);
			if (Object.prototype.hasOwnProperty.call(this, key) && fieldMetadata) {
				const originalValue = payload
					? (payload as Indexable)[fieldMetadata.field]
					: null;
				const {validatedValue, debugInfo} = validateValue(
					originalValue,
					fieldMetadata.type,
					fieldMetadata.array,
					this._debugFunction,
					this._debugSkipUndef
				);
				if (
					this._debugFunction &&
					debugInfo &&
					(!this._debugSkipUndef || debugInfo !== DEBUG_INFO.EMPTY)
				) {
					this._debugFunction({
						class: constructor.name,
						field: fieldMetadata.field,
						info: debugInfo,
						value: JSON.stringify(originalValue)
					});
				}

				const instance = this as unknown as Indexable;
				const defaultValue = instance[key];
				instance[key] =
					(!payload || !Object.prototype.hasOwnProperty.call(payload, key)) &&
					defaultValue
						? defaultValue
						: validatedValue;
			}
		}
	}
}

export function Model<T extends Constructor>(classs: T): Constructor {
	return class extends classs {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		public constructor(...args: any[]) {
			super(...args);
			try {
				this['_init'](classs, args[0]);
			} catch (e) {
				console.error(e);
				console.error('Maybe you forgot to extend Entity on this component?');
				throw e;
			}
		}
	};
}