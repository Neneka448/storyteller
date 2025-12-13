export type Id = string

export interface Identifiable {
    id: Id
}

export interface Timestamped {
    createdAt: number
    updatedAt: number
}

export interface Repository<T extends Identifiable, TId extends Id = Id> {
    get(id: TId): T | null
    list(): T[]
    create(input: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<T, 'id'>>): T
    update(id: TId, patch: Partial<Omit<T, 'id' | 'createdAt'>>): T
    delete(id: TId): void
}
