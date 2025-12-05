import api from './api';

export const permissionService = {
  getAllPermissions: async (chatId: string) => {
    const response = await api.get<any>(
      `/permissions/${chatId}/all`
    );
    return response.data?.data || response.data;
  },

  getUserPermissions: async (chatId: string, userId: string) => {
    const response = await api.get<any>(
      `/permissions/${chatId}/${userId}`
    );
    return response.data?.data || response.data;
  },

  grantPermission: async (
    chatId: string,
    userId: string,
    permissionName: string
  ) => {
    const response = await api.post<any>('/permissions/grant', {
      chatId,
      userId,
      permission: permissionName,
    });
    return response.data?.data || response.data;
  },

  revokePermission: async (
    chatId: string,
    userId: string,
    permissionName: string
  ) => {
    const response = await api.post<any>('/permissions/revoke', {
      chatId,
      userId,
      permission: permissionName,
    });
    return response.data?.data || response.data;
  },
};
