export interface MediaFile {
  name: string
  path: string
  file_type: string
  size: number
}

export interface FolderGroup {
  folder_path: string
  folder_name: string
  files: MediaFile[]
  parent_path?: string
  level: number
  is_expanded?: boolean
}

export interface ReadFolderResult {
  groups: FolderGroup[]
  total_count: number
}

export type FileFilter = 'all' | 'image' | 'other'

export interface FileTypeCount {
  all: number
  image: number
  other: number
}

export interface FolderSortInfo {
  path: string
  element: HTMLElement | null
}
