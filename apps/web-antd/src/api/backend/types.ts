/**
 * 业务数据结构的通用形状，与具体后端（Nitro Mock / yudao）无关。
 * 页面层统一依赖这些类型。
 */
export interface GymRow {
  id: string;
  [key: string]: any;
}

export interface GymPage {
  items: GymRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 资源型后端适配器。页面只依赖这套接口，底层由 v1(Nitro) 或 yudao 实现。
 */
export interface GymResourceAdapter {
  /** 分页列表 */
  list(path: string, params?: Record<string, any>): Promise<GymPage>;
  /** 单条详情 / 子资源 */
  get<T = GymRow>(path: string, params?: Record<string, any>): Promise<T>;
  /** 新增（可带幂等键） */
  post<T = GymRow>(path: string, data: unknown, key?: string): Promise<T>;
  /** 局部更新 */
  patch(path: string, data: unknown): Promise<GymRow>;
  /** 覆盖更新 / 子资源写入 */
  put<T = GymRow>(path: string, data: unknown): Promise<T>;
  /** 上传文件，返回可被页面引用的文件记录 */
  uploadFile(file: File, category: string, storeId?: string): Promise<GymRow>;
  /** 获取可预览的文件地址（blob: 或 http(s):） */
  getFileUrl(id: string): Promise<string>;
}
