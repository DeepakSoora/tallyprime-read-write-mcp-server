export interface ModelPullReportOutputFieldInfo {
    identifier: string;
    name: string;
    datatype: string;
    fields?: ModelPullReportOutputFieldInfo[];
}

export interface ModelPullReportInputInfo {
    name: string;
    datatype: string;
    validation_regex?: string;
    validation_message?: string;
}

export interface ModelPullReportOutputInfo {
    datatype: string;
    fields?: ModelPullReportOutputFieldInfo[];
}

export interface ModelPullResponse {
    data: any | undefined;
    error?: string;
}

export interface ModelPullReportInfo {
    name: string;
    input: ModelPullReportInputInfo[];
    output: ModelPullReportOutputInfo;
}

export interface ModelPushResponse {
    success: boolean;
    created?: number;
    altered?: number;
    lastvchid?: string;
    errors?: string[];
}

// Bulk import interfaces
export interface VoucherImportResult {
    rowNumber: number;
    voucherId?: string;
    success: boolean;
    tallyVoucherId?: string;
    errors?: string[];
}

export interface BulkImportResult {
    success: boolean;
    totalVouchers: number;
    successCount: number;
    failureCount: number;
    results: VoucherImportResult[];
    parseWarnings?: string[];
}