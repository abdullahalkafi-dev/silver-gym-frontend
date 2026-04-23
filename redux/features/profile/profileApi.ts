import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";
import { resolveUploadAssetUrl } from "@/lib/assetUrl";

type RawUserProfile = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  profilePicture?: string | null;
};

type RawBusinessProfile = {
  _id?: string;
  id?: string;
  logo?: string | null;
  businessName?: string;
  businessType?: "gym" | "fitness" | "studio" | "other";
  registrationNumber?: string;
  country?: string;
  city?: string;
  zip?: string;
  businessAddress?: string;
  businessPhoneNumber?: string;
  businessEmail?: string;
};

export type UserProfileResponse = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  countryCode?: string;
  profilePicture?: string;
};

export type BusinessProfileResponse = {
  id: string;
  logo?: string;
  businessName: string;
  businessType: "gym" | "fitness" | "studio" | "other";
  registrationNumber?: string;
  country?: string;
  city?: string;
  zip?: string;
  businessAddress?: string;
  businessPhoneNumber?: string;
  businessEmail?: string;
};

export type UpdateMyProfilePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  countryCode?: string;
  profilePicture?: File;
};

export type UpdateBusinessProfilePayload = {
  businessName?: string;
  businessType?: "gym" | "fitness" | "studio" | "other";
  registrationNumber?: string;
  country?: string;
  city?: string;
  zip?: string;
  businessAddress?: string;
  businessPhoneNumber?: string;
  businessEmail?: string;
  logo?: File;
};

const normalizeUserProfile = (raw: RawUserProfile): UserProfileResponse => {
  const firstName = raw.firstName?.trim() || "";
  const lastName = raw.lastName?.trim() || "";
  const fullName = `${firstName} ${lastName}`.trim() || "User";

  return {
    id: String(raw._id || raw.id || ""),
    firstName,
    lastName,
    fullName,
    email: raw.email || "",
    phone: raw.phone || "",
    countryCode: raw.countryCode,
    profilePicture: resolveUploadAssetUrl(raw.profilePicture),
  };
};

const normalizeBusinessProfile = (raw: RawBusinessProfile): BusinessProfileResponse => {
  return {
    id: String(raw._id || raw.id || ""),
    logo: resolveUploadAssetUrl(raw.logo),
    businessName: raw.businessName || "",
    businessType: raw.businessType || "other",
    registrationNumber: raw.registrationNumber,
    country: raw.country,
    city: raw.city,
    zip: raw.zip,
    businessAddress: raw.businessAddress,
    businessPhoneNumber: raw.businessPhoneNumber,
    businessEmail: raw.businessEmail,
  };
};

export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyProfile: builder.query<UserProfileResponse, void>({
      query: () => ({
        url: "/users/me",
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<RawUserProfile>) =>
        normalizeUserProfile(response.data || {}),
      providesTags: ["Profile"],
    }),

    updateMyProfile: builder.mutation<UserProfileResponse, UpdateMyProfilePayload>({
      query: (payload) => {
        const { profilePicture, ...rest } = payload;

        if (profilePicture) {
          const formData = new FormData();
          formData.append("image", profilePicture);
          formData.append("data", JSON.stringify(rest));

          return {
            url: "/users/update-profile",
            method: "PATCH",
            body: formData,
            headers: undefined,
          };
        }

        return {
          url: "/users/update-profile",
          method: "PATCH",
          body: { data: rest },
        };
      },
      transformResponse: (response: ApiSuccessResponse<RawUserProfile>) =>
        normalizeUserProfile(response.data || {}),
      invalidatesTags: ["Profile"],
    }),

    getBusinessProfile: builder.query<BusinessProfileResponse, void>({
      query: () => ({
        url: "/business-profile",
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<RawBusinessProfile>) =>
        normalizeBusinessProfile(response.data || {}),
      providesTags: ["Profile"],
    }),

    updateBusinessProfile: builder.mutation<
      BusinessProfileResponse,
      UpdateBusinessProfilePayload
    >({
      query: (payload) => {
        const { logo, ...dataWithoutLogo } = payload;

        if (logo) {
          const formData = new FormData();
          formData.append("image", logo);
          formData.append("data", JSON.stringify(dataWithoutLogo));

          return {
            url: "/business-profile",
            method: "PATCH",
            body: formData,
            headers: undefined,
          };
        }

        return {
          url: "/business-profile",
          method: "PATCH",
          body: { data: dataWithoutLogo },
        };
      },
      transformResponse: (response: ApiSuccessResponse<RawBusinessProfile>) =>
        normalizeBusinessProfile(response.data || {}),
      invalidatesTags: ["Profile"],
    }),
  }),
});

export const {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useGetBusinessProfileQuery,
  useUpdateBusinessProfileMutation,
} = profileApi;
