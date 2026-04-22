import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";
import type {
  GymPackage,
  PackageFormPayload,
  PackageListMeta,
  PackageListResponse,
  PackageQueryArgs,
  PackageDurationType,
} from "@/types/package";

type RawPackage = {
  _id?: string;
  id?: string;
  branchId?: string;
  title?: string;
  duration?: number;
  durationType?: string;
  description?: string;
  color?: string;
  amount?: number;
  includeAdmissionFee?: boolean;
  admissionFeeAmount?: number | null;
  isActive?: boolean;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
};

type RawPackageListResponse = ApiSuccessResponse<RawPackage[]> & {
  meta?: PackageListMeta;
};

type PackageMutationArgs = {
  branchId: string;
  payload: PackageFormPayload;
};

type PackageUpdateArgs = PackageMutationArgs & {
  packageId: string;
};

type PackageActionArgs = {
  branchId: string;
  packageId: string;
};

const normalizeDurationType = (durationType?: string): PackageDurationType => {
  switch (durationType) {
    case "day":
    case "week":
    case "month":
    case "year":
      return durationType;
    default:
      return "month";
  }
};

const normalizePackage = (rawPackage: RawPackage): GymPackage => ({
  id: String(rawPackage.id || rawPackage._id || ""),
  branchId: String(rawPackage.branchId || ""),
  title: rawPackage.title || "Untitled Package",
  duration: Number(rawPackage.duration || 0),
  durationType: normalizeDurationType(rawPackage.durationType),
  description: rawPackage.description || undefined,
  color: rawPackage.color || "#7C3AED",
  amount: Number(rawPackage.amount || 0),
  includeAdmissionFee: Boolean(rawPackage.includeAdmissionFee),
  admissionFeeAmount: rawPackage.admissionFeeAmount ?? null,
  isActive: rawPackage.isActive ?? true,
  source: rawPackage.source,
  createdAt: rawPackage.createdAt,
  updatedAt: rawPackage.updatedAt,
});

export const packageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBranchPackages: builder.query<PackageListResponse, PackageQueryArgs>({
      query: ({ branchId, isActive = true, searchTerm }) => ({
        url: `/packages/${branchId}`,
        method: "GET",
        params: {
          isActive: String(isActive),
          ...(searchTerm ? { searchTerm } : {}),
          sort: "-createdAt",
        },
      }),
      transformResponse: (response: RawPackageListResponse) => ({
        data: Array.isArray(response.data)
          ? response.data.map(normalizePackage)
          : [],
        meta: response.meta,
      }),
      providesTags: (result, _error, { branchId }) => {
        const baseTags: Array<{ type: "Package"; id: string }> = [
          { type: "Package", id: `LIST-${branchId}` },
        ];

        if (!result?.data.length) {
          return baseTags;
        }

        return [
          ...baseTags,
          ...result.data.map((pkg) => ({ type: "Package" as const, id: pkg.id })),
        ];
      },
    }),

    createBranchPackage: builder.mutation<GymPackage, PackageMutationArgs>({
      query: ({ branchId, payload }) => ({
        url: `/packages/${branchId}`,
        method: "POST",
        body: payload,
      }),
      transformResponse: (response: ApiSuccessResponse<RawPackage>) => {
        return normalizePackage(response.data);
      },
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "Package", id: `LIST-${branchId}` },
      ],
    }),

    updateBranchPackage: builder.mutation<GymPackage, PackageUpdateArgs>({
      query: ({ branchId, packageId, payload }) => ({
        url: `/packages/${branchId}/${packageId}`,
        method: "PATCH",
        body: payload,
      }),
      transformResponse: (response: ApiSuccessResponse<RawPackage>) => {
        return normalizePackage(response.data);
      },
      invalidatesTags: (_result, _error, { branchId, packageId }) => [
        { type: "Package", id: `LIST-${branchId}` },
        { type: "Package", id: packageId },
      ],
    }),

    archiveBranchPackage: builder.mutation<GymPackage, PackageActionArgs>({
      query: ({ branchId, packageId }) => ({
        url: `/packages/${branchId}/${packageId}`,
        method: "DELETE",
      }),
      transformResponse: (response: ApiSuccessResponse<RawPackage>) => {
        return normalizePackage(response.data);
      },
      invalidatesTags: (_result, _error, { branchId, packageId }) => [
        { type: "Package", id: `LIST-${branchId}` },
        { type: "Package", id: packageId },
      ],
    }),

    restoreBranchPackage: builder.mutation<GymPackage, PackageActionArgs>({
      query: ({ branchId, packageId }) => ({
        url: `/packages/${branchId}/${packageId}/restore`,
        method: "PATCH",
      }),
      transformResponse: (response: ApiSuccessResponse<RawPackage>) => {
        return normalizePackage(response.data);
      },
      invalidatesTags: (_result, _error, { branchId, packageId }) => [
        { type: "Package", id: `LIST-${branchId}` },
        { type: "Package", id: packageId },
      ],
    }),
  }),
});

export const {
  useGetBranchPackagesQuery,
  useCreateBranchPackageMutation,
  useUpdateBranchPackageMutation,
  useArchiveBranchPackageMutation,
  useRestoreBranchPackageMutation,
} = packageApi;