import { prisma } from './prisma';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface JobRun {
    id: string;
    queueName: string;
    jobName: string;
    jobId: string | null;
    status: JobStatus;
    payload: Record<string, unknown> | null;
    result: Record<string, unknown> | null;
    errorMessage: string | null;
    attempts: number;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
}

export interface CreateJobRunParams {
    queueName: string;
    jobName: string;
    jobId?: string;
    payload?: Record<string, unknown>;
}

export interface UpdateJobRunParams {
    status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    result?: Record<string, unknown>;
    errorMessage?: string;
    attempts?: number;
    startedAt?: Date;
    completedAt?: Date;
}

export async function createJobRun(params: CreateJobRunParams) {
    return prisma.jobRun.create({
        data: {
            queueName: params.queueName,
            jobName: params.jobName,
            jobId: params.jobId,
            payload: params.payload as object | undefined,
            status: 'PENDING',
        },
    });
}

export async function updateJobRun(id: string, params: UpdateJobRunParams) {
    const data: Record<string, unknown> = {};

    if (params.status !== undefined) data.status = params.status;
    if (params.result !== undefined) data.result = params.result;
    if (params.errorMessage !== undefined) data.errorMessage = params.errorMessage;
    if (params.attempts !== undefined) data.attempts = params.attempts;
    if (params.startedAt !== undefined) data.startedAt = params.startedAt;
    if (params.completedAt !== undefined) data.completedAt = params.completedAt;

    return prisma.jobRun.update({
        where: { id },
        data,
    });
}

export async function getJobRuns(options?: {
    queueName?: string;
    status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    limit?: number;
}): Promise<JobRun[]> {
    const where: Record<string, unknown> = {};

    if (options?.queueName) {
        where.queueName = options.queueName;
    }
    if (options?.status) {
        where.status = options.status;
    }

    return prisma.jobRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
    }) as Promise<JobRun[]>;
}

export async function getJobRunById(id: string) {
    return prisma.jobRun.findUnique({
        where: { id },
    });
}

export async function getJobRunByJobId(jobId: string) {
    return prisma.jobRun.findFirst({
        where: { jobId },
    });
}
