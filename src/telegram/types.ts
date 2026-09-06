export type TdObject = Record<string, unknown>;
export type TelegramFile = {
  file_name?: string;
  mime_type?: string;
  size?: number;
  telegram_file_id?: number;
  is_downloaded?: boolean;
  local_path?: string;
};
