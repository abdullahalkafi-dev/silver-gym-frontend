import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";
import type {
  ComparisonOption,
  CostAnalyticsData,
  FinancialsCompareData,
  MemberStats,
  MonthlyFinancialData,
  PackageListItem,
  PackagesAnalyticsData,
} from "@/types/analytics";

const comparisonOptions: ComparisonOption[] = [
  {
    id: "income",
    label: "Income",
    description: "Total income generated from member payments",
    icon: "money-receive",
  },
  {
    id: "expense",
    label: "Expense",
    description: "Total expenses recorded for gym operations",
    icon: "money-send",
  },
  {
    id: "netIncome",
    label: "Net Income",
    description: "Difference between total income and total expense",
    icon: "chart",
  },
];

type BranchArgs = {
  branchId: string;
};

type YearMonthArgs = BranchArgs & {
  year?: number;
  month?: string;
};

type CompareArgs = BranchArgs & {
  metric?: "income" | "expense" | "netIncome";
  startYear: number;
  endYear: number;
};

type OverviewArgs = BranchArgs & {
  year?: number;
  month?: string;
  transactionLimit?: number;
};

type MemberSummaryRaw = {
  totalMembers: number;
  newAdmissions: number;
  activeMembers: number;
  admissionChart: Array<{ month: string; value: number }>;
  admissionChartPeriod: string;
  currentAdmissions?: number;
  admissionGrowthPercent?: number;
  availableYears: number[];
};

type FinancialSummaryRaw = {
  month: string;
  year: number;
  data: Array<{ period: string; income: number; expense: number }>;
  metrics: {
    totalIncome: number;
    totalExpense: number;
    totalNetIncome: number;
    incomeChangePercent: number;
    expenseChangePercent: number;
    netIncomeChangePercent: number;
  };
  availableYears: number[];
};

type CostSummaryRaw = {
  totalCost: number;
  month: string;
  year: number;
  categories: Array<{ name: string; value: number; percentage: number; color: string }>;
  availableYears: number[];
};

type PackagesSummaryRaw = {
  year: number;
  chartData: PackagesAnalyticsData["chartData"];
  stats: Array<{ label: string; count: number; unit: string; percentage: number }>;
  packagesList: Array<{ id: string; title: string; color: string }>;
  packageRows: Array<{ month: number; packageType: string; packageTitle: string; count: number }>;
  memberPackageSummary: Array<{ packageId: string | null; packageTitle: string; count: number }>;
  availableYears: number[];
};

type CompareSummaryRaw = {
  metric: "income" | "expense" | "netIncome";
  years: number[];
  chartData: Array<Record<string, number | string>>;
  tableData: Array<{ date: string; income: number; expense: number; netIncome: number }>;
  balance: number;
};

type OverviewRaw = {
  selectedYear: number;
  selectedMonth: string;
  stats: Array<{ label: string; description: string; value: string | number; unit?: string }>;
  progress: {
    yearlyData: Array<{ month: string; value: number }>;
    monthlyData: Array<{ month: string; value: number }>;
    totalValue: number;
    subtitle: string;
  };
  pie: {
    centerValue: number;
    description: string;
    data: Array<{ name: string; value: number; color: string }>;
  };
  line: {
    percentage: number;
    data: Array<{ period: string; income: number; expense: number }>;
  };
  transactions: Array<{
    id: string;
    date: string;
    categoryName: string;
    memberId: string | null;
    memberCustomId: string | null;
    category: string;
    payment: string;
    amount: number;
    balance: number;
  }>;
  availableYears: number[];
};

export type MemberAnalyticsResponse = {
  data: MemberStats;
  availableYears: number[];
};

export type FinancialAnalyticsResponse = {
  data: MonthlyFinancialData;
  availableYears: number[];
};

export type CostAnalyticsResponse = {
  data: CostAnalyticsData;
  availableYears: number[];
};

export type PackagesAnalyticsResponse = {
  data: PackagesAnalyticsData;
  availableYears: number[];
};

export type FinancialCompareResponse = {
  data: FinancialsCompareData;
};

export type OverviewResponse = {
  selectedYear: number;
  selectedMonth: string;
  stats: Array<{ label: string; description: string; value: string | number; unit?: string }>;
  progress: {
    yearlyData: Array<{ month: string; value: number }>;
    monthlyData: Array<{ month: string; value: number }>;
    totalValue: string;
    subtitle: string;
  };
  pie: {
    centerValue: string;
    description: string;
    data: Array<{ name: string; value: number; color: string }>;
  };
  line: {
    percentage: string;
    data: Array<{ period: string; income: number; expense: number }>;
  };
  transactions: OverviewRaw["transactions"];
  availableYears: number[];
};

export type AnalyticsConfigResponse = {
  comparisonOptions: ComparisonOption[];
  availableYears: number[];
};

const formatCurrency = (value: number) => `${value.toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})} TK`;

const formatSignedPercent = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsMemberSummary: builder.query<MemberAnalyticsResponse, YearMonthArgs>({
      query: ({ branchId, year, month }) => ({
        url: `/analytics/${branchId}/member-summary`,
        params: {
          ...(year ? { year } : {}),
          ...(month ? { month } : {}),
        },
      }),
      transformResponse: (response: ApiSuccessResponse<MemberSummaryRaw>) => ({
        data: {
          totalMembers: response.data.totalMembers,
          totalMembersUnit: "/Person",
          totalMembersDescription: "Total overall number of registered members in your gym",
          newAdmissions: response.data.newAdmissions,
          newAdmissionsUnit: "/Person",
          newAdmissionsDescription: "Members who joined during the selected window",
          activeMembers: response.data.activeMembers,
          activeMembersUnit: "/Person",
          activeMembersDescription: "Members with valid packages and ongoing gym access",
          admissionChart: response.data.admissionChart,
          admissionChartPeriod: response.data.admissionChartPeriod,
          currentAdmissions: response.data.currentAdmissions,
          admissionGrowth: formatSignedPercent(response.data.admissionGrowthPercent ?? 0),
        },
        availableYears: response.data.availableYears,
      }),
      providesTags: (_result, _error, { branchId }) => [
        { type: "Analytics", id: `MEMBER-${branchId}` },
        { type: "Analytics" as const },
      ],
    }),

    getAnalyticsFinancialSummary: builder.query<FinancialAnalyticsResponse, YearMonthArgs>({
      query: ({ branchId, year, month }) => ({
        url: `/analytics/${branchId}/financial`,
        params: {
          ...(year ? { year } : {}),
          ...(month ? { month } : {}),
        },
      }),
      transformResponse: (response: ApiSuccessResponse<FinancialSummaryRaw>) => ({
        data: {
          month: response.data.month,
          data: response.data.data,
          metrics: {
            totalIncome: formatCurrency(response.data.metrics.totalIncome),
            totalExpense: formatCurrency(response.data.metrics.totalExpense),
            totalNetIncome: formatCurrency(response.data.metrics.totalNetIncome),
            incomeChange: formatSignedPercent(response.data.metrics.incomeChangePercent),
            expenseChange: formatSignedPercent(response.data.metrics.expenseChangePercent),
            netIncomeChange: formatSignedPercent(response.data.metrics.netIncomeChangePercent),
          },
        },
        availableYears: response.data.availableYears,
      }),
      providesTags: (_result, _error, { branchId }) => [
        { type: "Analytics", id: `FINANCIAL-${branchId}` },
        { type: "Analytics" as const },
      ],
    }),

    getAnalyticsCostSummary: builder.query<CostAnalyticsResponse, YearMonthArgs>({
      query: ({ branchId, year, month }) => ({
        url: `/analytics/${branchId}/cost`,
        params: {
          ...(year ? { year } : {}),
          ...(month ? { month } : {}),
        },
      }),
      transformResponse: (response: ApiSuccessResponse<CostSummaryRaw>) => ({
        data: {
          totalCost: `${response.data.totalCost.toLocaleString("en-US")}/-`,
          month: response.data.month,
          year: String(response.data.year),
          categories: response.data.categories.map((item) => ({
            ...item,
            amount: item.value.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          })),
        },
        availableYears: response.data.availableYears,
      }),
      providesTags: (_result, _error, { branchId }) => [
        { type: "Analytics", id: `COST-${branchId}` },
        { type: "Analytics" as const },
      ],
    }),

    getAnalyticsPackagesSummary: builder.query<PackagesAnalyticsResponse, BranchArgs & { year?: number }>({
      query: ({ branchId, year }) => ({
        url: `/analytics/${branchId}/packages`,
        params: {
          ...(year ? { year } : {}),
        },
      }),
      transformResponse: (response: ApiSuccessResponse<PackagesSummaryRaw>) => ({
        data: {
          year: String(response.data.year),
          chartData: response.data.chartData,
          stats: response.data.stats.map((item) => ({
            label: item.label,
            count: item.count,
            unit: item.unit,
            percentage: `${item.percentage.toFixed(1)}%`,
          })),
          packagesList: response.data.packagesList || [],
          packageRows: response.data.packageRows || [],
          memberPackageSummary: response.data.memberPackageSummary || [],
        },
        availableYears: response.data.availableYears,
      }),
      providesTags: (_result, _error, { branchId }) => [
        { type: "Analytics", id: `PACKAGES-${branchId}` },
        { type: "Analytics" as const },
      ],
    }),

    getAnalyticsCompareSummary: builder.query<FinancialCompareResponse, CompareArgs>({
      query: ({ branchId, metric, startYear, endYear }) => ({
        url: `/analytics/${branchId}/compare`,
        params: {
          metric,
          startYear,
          endYear,
        },
      }),
      transformResponse: (response: ApiSuccessResponse<CompareSummaryRaw>) => ({
        data: {
          years: response.data.years.map((year) => String(year)),
          chartData: response.data.chartData.map((row) => {
            const mapped: Record<string, string | number> = {};
            Object.entries(row).forEach(([key, value]) => {
              mapped[key] = value;
            });
            return mapped as FinancialsCompareData["chartData"][number];
          }),
          tableData: response.data.tableData.map((row) => ({
            date: row.date,
            income: formatCurrency(row.income),
            expense: formatCurrency(row.expense),
            netIncome: formatCurrency(row.netIncome),
          })),
          balance: formatCurrency(response.data.balance),
        },
      }),
      providesTags: (_result, _error, { branchId }) => [
        { type: "Analytics", id: `COMPARE-${branchId}` },
        { type: "Analytics" as const },
      ],
    }),

    getAnalyticsOverview: builder.query<OverviewResponse, OverviewArgs>({
      query: ({ branchId, year, month, transactionLimit }) => ({
        url: `/analytics/${branchId}/overview`,
        params: {
          ...(year ? { year } : {}),
          ...(month ? { month } : {}),
          ...(transactionLimit ? { transactionLimit } : {}),
        },
      }),
      transformResponse: (response: ApiSuccessResponse<OverviewRaw>) => ({
        selectedYear: response.data.selectedYear,
        selectedMonth: response.data.selectedMonth,
        stats: response.data.stats.map((item) => ({
          ...item,
          value: typeof item.value === "number" && (item.label === "Income" || item.label === "Expense")
            ? formatCurrency(item.value)
            : item.value,
        })),
        progress: {
          yearlyData: response.data.progress.yearlyData,
          monthlyData: response.data.progress.monthlyData,
          totalValue: `$${response.data.progress.totalValue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          subtitle: response.data.progress.subtitle,
        },
        pie: {
          centerValue: `${response.data.pie.centerValue}K`,
          description: response.data.pie.description,
          data: response.data.pie.data,
        },
        line: {
          percentage: `${response.data.line.percentage.toFixed(1)}%`,
          data: response.data.line.data,
        },
        transactions: response.data.transactions.map((item) => ({
          ...item,
          memberCustomId:
            typeof item.memberCustomId === "string" ? item.memberCustomId : null,
        })),
        availableYears: response.data.availableYears,
      }),
      providesTags: (_result, _error, { branchId }) => [
        { type: "Analytics", id: `OVERVIEW-${branchId}` },
        { type: "Analytics" as const },
      ],
    }),

    getAnalyticsConfig: builder.query<AnalyticsConfigResponse, BranchArgs>({
      query: ({ branchId }) => ({
        url: `/analytics/${branchId}/member-summary`,
      }),
      transformResponse: (response: ApiSuccessResponse<MemberSummaryRaw>) => ({
        comparisonOptions,
        availableYears: response.data.availableYears,
      }),
      providesTags: (_result, _error, { branchId }) => [
        { type: "Analytics", id: `CONFIG-${branchId}` },
        { type: "Analytics" as const },
      ],
    }),
  }),
});

export const {
  useGetAnalyticsMemberSummaryQuery,
  useGetAnalyticsFinancialSummaryQuery,
  useGetAnalyticsCostSummaryQuery,
  useGetAnalyticsPackagesSummaryQuery,
  useGetAnalyticsCompareSummaryQuery,
  useGetAnalyticsOverviewQuery,
  useGetAnalyticsConfigQuery,
} = analyticsApi;
