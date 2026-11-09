import { Job, Worker } from 'bullmq'
import { WorkerOptions } from 'bullmq/dist/esm/interfaces'

export const WorkerFactorySymbol = Symbol.for('WorkerFactorySymbol')
export type WorkerFactory = <TData>(
  name: string,
  processor: (job: Job<TData>) => void,
  options: WorkerOptions,
) => Worker<TData>
