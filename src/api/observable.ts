import {ObservableValue} from "../types/observablevalue";
import {ValueMode, getValueModeFromValue, makeChildObservable} from "../types/modifiers";
import {ComputedValue} from "../core/computedvalue";
import {isPlainObject, invariant} from "../utils/utils";
import {observableDecorator} from "./observabledecorator";
import {isObservable} from "./isobservable";
import {IObservableArray, ObservableArray} from "../types/observablearray";

export interface IObservableValue<T> {
	get(): T;
	set(value: T): void;
}

/**
	* Turns an object, array or function into a reactive structure.
	* @param value the value which should become observable.
	*/
export function observable(target: Object, key: string, baseDescriptor?: PropertyDescriptor): any;
export function observable<T>(value: T[]): IObservableArray<T>;
export function observable<T, S extends Object>(value: () => T, thisArg?: S): IObservableValue<T>;
export function observable<T extends string|number|boolean|Date|RegExp|Function|void>(value: T): IObservableValue<T>;
export function observable<T extends Object>(value: T): T;
export function observable(v: any, keyOrScope?: string | any) {
	if (typeof arguments[1] === "string")
		return observableDecorator.apply(null, arguments);

	invariant(arguments.length === 1 || arguments.length === 2, "observable expects one or two arguments");
	if (isObservable(v))
		return v;

	let [mode, value] = getValueModeFromValue(v, ValueMode.Recursive);
	const sourceType = mode === ValueMode.Reference ? ValueType.Reference : getTypeOfValue(value);

	switch (sourceType) {
		case ValueType.Reference:
		case ValueType.ComplexObject:
			return new ObservableValue(value, mode);
		case ValueType.ComplexFunction:
			throw new Error("[mobservable.observable] To be able to make a function reactive it should not have arguments. If you need an observable reference to a function, use `observable(asReference(f))`");
		case ValueType.ViewFunction:
			return new ComputedValue(value, keyOrScope, mode === ValueMode.Structure, value.name || "ComputedValue");
		case ValueType.Array:
		case ValueType.PlainObject:
			return makeChildObservable(value, mode);
	}
	invariant(false, "Illegal State");
}

export enum ValueType { Reference, PlainObject, ComplexObject, Array, ViewFunction, ComplexFunction }

export function getTypeOfValue(value): ValueType {
	if (value === null || value === undefined)
		return ValueType.Reference;
	if (typeof value === "function")
		return value.length ? ValueType.ComplexFunction : ValueType.ViewFunction;
	if (Array.isArray(value) || value instanceof ObservableArray)
		return ValueType.Array;
	if (typeof value === "object")
		return isPlainObject(value) ? ValueType.PlainObject : ValueType.ComplexObject;
	return ValueType.Reference; // safe default, only refer by reference..
}