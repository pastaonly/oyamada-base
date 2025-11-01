export type ActivityOption = {
  id: string;
  label: string;
};

export type ActivityDefinition = {
  id: string;
  title: string;
  iconId: string;
  options: ActivityOption[];
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type ActivityPhotoInfo = {
  url: string;
  thumbnailUrl: string;
  storagePath: string;
  thumbnailStoragePath: string;
};

export type ActivityUserSnapshot = {
  userId: string;
  displayName: string;
  avatarUrl: string;
};

export type ActivityLog = {
  id: string;
  definitionId: string;
  definitionTitle: string;
  definitionIconId: string;
  optionIds: string[];
  optionLabels: string[];
  note: string;
  executedAt: Date;
  createdAt: Date | null;
  updatedAt: Date | null;
  user: ActivityUserSnapshot;
  photo: ActivityPhotoInfo | null;
  thanksCount: number;
  commentCount: number;
};

export type ActivityComment = {
  id: string;
  logId: string;
  body: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  user: ActivityUserSnapshot;
};

export type CreateActivityDefinitionInput = {
  title: string;
  iconId: string;
  options: ActivityOption[];
  isActive: boolean;
};

export type UpdateActivityDefinitionInput = Partial<CreateActivityDefinitionInput>;

export type CreateActivityLogInput = {
  definitionId: string;
  optionIds: string[];
  note: string;
  executedAt: Date;
  photoFile: File | null;
};

export type UpdateActivityLogInput = {
  optionIds: string[];
  note: string;
  executedAt: Date;
  photoFile: File | null;
  removePhoto: boolean;
};

export type CreateActivityCommentInput = {
  body: string;
};

export type UpdateActivityCommentInput = {
  body: string;
};
