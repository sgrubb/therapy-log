declare const __brand: unique symbol;

export type Brand<B> = { [__brand]: B };
export type Branded<T, B> = T & Brand<B>;

export const brand = <T, B>(value: T): Branded<T, B> => value as Branded<T, B>;

export type TherapistId = Branded<number, "TherapistId">;
export type ClientId = Branded<number, "ClientId">;
export type SessionId = Branded<number, "SessionId">;
export type ExpectedSessionId = Branded<string, "ExpectedSessionId">;

export const therapistId = (id: number): TherapistId => brand(id);
export const clientId = (id: number): ClientId => brand(id);
export const sessionId = (id: number): SessionId => brand(id);
export const expectedSessionId = (id: string): ExpectedSessionId => brand(id);
