use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MediaFile {
    pub name: String,
    pub path: String,
    pub file_type: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FolderGroup {
    pub folder_path: String,
    pub folder_name: String,
    pub files: Vec<MediaFile>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReadFolderResult {
    pub groups: Vec<FolderGroup>,
    pub total_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub format: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileStats {
    pub created: u64,
    pub modified: u64,
}

const IMAGE_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "bmp", "webp", "ico", "tiff", "tif",
    "avif", "heic", "heif", "jxl", "jfif", "pjpeg", "pjp",
];

fn get_file_type(extension: &str) -> String {
    let ext = extension.to_lowercase();
    if IMAGE_EXTENSIONS.contains(&ext.as_str()) {
        "image".to_string()
    } else {
        "other".to_string()
    }
}

#[tauri::command]
fn get_all_files(folder_paths: Vec<String>) -> Result<ReadFolderResult, String> {
    let mut all_groups: Vec<FolderGroup> = Vec::new();
    
    for folder_path in folder_paths {
        let path = Path::new(&folder_path);
        
        // 跳过不存在的路径和非文件夹
        if !path.exists() || !path.is_dir() {
            continue;
        }
        
        // 获取根文件夹名称
        let root_name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| folder_path.clone());
        
        let base_path = path.to_string_lossy().to_string();
        let mut folder_map: HashMap<String, Vec<MediaFile>> = HashMap::new();
        
        // 初始化根文件夹条目（即使没有文件也要显示）
        folder_map.entry(base_path.clone()).or_insert_with(Vec::new);
        
        // 递归遍历所有文件（包括根文件夹中的文件）
        for entry in WalkDir::new(path)
            .min_depth(1)  // 包含根文件夹内的文件
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let entry_path = entry.path();
            
            if entry_path.is_file() {
                let extension = entry_path
                    .extension()
                    .map(|e| e.to_string_lossy().to_string())
                    .unwrap_or_default();
                
                let size = fs::metadata(entry_path)
                    .map(|m| m.len())
                    .unwrap_or(0);
                
                let parent_path = entry_path
                    .parent()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();
                
                let file = MediaFile {
                    name: entry_path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default(),
                    path: entry_path.to_string_lossy().to_string(),
                    file_type: get_file_type(&extension),
                    size,
                };
                
                folder_map
                    .entry(parent_path)
                    .or_insert_with(Vec::new)
                    .push(file);
            }
        }
        
        // 转换为分组列表
        for (folder_path, mut files) in folder_map {
            files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
            
            // 计算相对于拖入文件夹的相对路径
            // 确保 base_path 以分隔符结尾，以便正确提取相对路径
            let base_path_with_sep = if base_path.ends_with('\\') || base_path.ends_with('/') {
                base_path.clone()
            } else {
                format!("{}\\", base_path)
            };
            
            let relative_path = if folder_path.starts_with(&base_path_with_sep) {
                // 子文件夹
                let rel = &folder_path[base_path_with_sep.len()..];
                format!("{}\\{}", root_name, rel)
            } else if folder_path == base_path {
                // 根文件夹本身
                root_name.clone()
            } else {
                // 其他情况（不应该发生）
                folder_path.clone()
            };
            
            all_groups.push(FolderGroup {
                folder_path: folder_path.clone(),
                folder_name: relative_path,
                files,
            });
        }
    }
    
    // 按文件夹路径层级排序（保持目录结构顺序）
    all_groups.sort_by(|a, b| {
        // 先按路径深度排序，再按名称排序
        let depth_a = a.folder_name.matches('\\').count() + a.folder_name.matches('/').count();
        let depth_b = b.folder_name.matches('\\').count() + b.folder_name.matches('/').count();
        
        match depth_a.cmp(&depth_b) {
            std::cmp::Ordering::Equal => a.folder_name.to_lowercase().cmp(&b.folder_name.to_lowercase()),
            other => other,
        }
    });
    
    let total_count: usize = all_groups.iter().map(|g| g.files.len()).sum();
    
    Ok(ReadFolderResult { groups: all_groups, total_count })
}

#[tauri::command]
async fn get_thumbnail(file_path: String, size: u32) -> Result<Vec<u8>, String> {
    #[cfg(windows)]
    {
        tokio::task::spawn_blocking(move || {
            get_windows_thumbnail(&file_path, size)
        })
        .await
        .map_err(|e| format!("任务执行失败: {}", e))?
    }
    
    #[cfg(not(windows))]
    {
        Err("仅支持 Windows 系统".to_string())
    }
}

#[cfg(windows)]
fn get_windows_thumbnail(file_path: &str, size: u32) -> Result<Vec<u8>, String> {
    use windows::Win32::Graphics::Gdi::*;
    use windows::Win32::UI::Shell::*;
    use windows::Win32::System::Com::*;
    use windows::Win32::Foundation::SIZE;
    use windows::core::PCWSTR;
    
    unsafe {
        let co_init_result = CoInitializeEx(None, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE);
        let should_uninit = co_init_result.is_ok();
        
        let path_wide: Vec<u16> = file_path.encode_utf16().chain(std::iter::once(0)).collect();
        
        let shell_item: IShellItem = SHCreateItemFromParsingName(PCWSTR(path_wide.as_ptr()), None)
            .map_err(|e| format!("创建ShellItem失败: {}", e))?;
        
        let image_factory: IShellItemImageFactory = windows::core::Interface::cast(&shell_item)
            .map_err(|e| format!("获取ImageFactory失败: {}", e))?;
        
        let size_struct = SIZE { cx: size as i32, cy: size as i32 };
        let hbitmap = image_factory.GetImage(size_struct, SIIGBF_RESIZETOFIT | SIIGBF_BIGGERSIZEOK)
            .map_err(|e| format!("获取缩略图失败: {}", e))?;
        
        let mut bmp = BITMAP::default();
        GetObjectW(
            hbitmap,
            std::mem::size_of::<BITMAP>() as i32,
            Some(&mut bmp as *mut _ as *mut _),
        );
        
        let width = bmp.bmWidth;
        let height = bmp.bmHeight;
        
        let hdc = GetDC(None);
        let hdc_mem = CreateCompatibleDC(hdc);
        
        let mut bmi = BITMAPINFO::default();
        bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        bmi.bmiHeader.biWidth = width;
        bmi.bmiHeader.biHeight = -height;
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = BI_RGB.0;
        
        let buffer_size = (width * height * 4) as usize;
        let mut buffer: Vec<u8> = vec![0; buffer_size];
        
        GetDIBits(
            hdc_mem,
            hbitmap,
            0,
            height as u32,
            Some(buffer.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );
        
        for chunk in buffer.chunks_mut(4) {
            chunk.swap(0, 2);
        }
        
        let png_data = encode_png(&buffer, width as u32, height as u32);
        
        let _ = DeleteObject(hbitmap);
        let _ = DeleteDC(hdc_mem);
        ReleaseDC(None, hdc);
        
        if should_uninit {
            CoUninitialize();
        }
        
        Ok(png_data)
    }
}

fn encode_png(data: &[u8], width: u32, height: u32) -> Vec<u8> {
    use png::{BitDepth, ColorType, Encoder};
    use std::io::Cursor;
    
    let mut png_data = Vec::new();
    let mut cursor = Cursor::new(&mut png_data);
    
    {
        let mut encoder = Encoder::new(&mut cursor, width, height);
        encoder.set_color(ColorType::Rgba);
        encoder.set_depth(BitDepth::Eight);
        
        let mut writer = encoder.write_header().unwrap();
        writer.write_image_data(data).unwrap();
    }
    
    png_data
}

#[tauri::command]
fn get_image_info(file_path: String) -> Result<ImageInfo, String> {
    use image::ImageFormat;
    
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("文件不存在".to_string());
    }
    
    let img = image::open(path)
        .map_err(|e| format!("无法读取图片: {}", e))?;
    
    let format = match image::ImageFormat::from_path(path) {
        Ok(ImageFormat::Jpeg) => "jpeg",
        Ok(ImageFormat::Png) => "png",
        Ok(ImageFormat::Gif) => "gif",
        Ok(ImageFormat::WebP) => "webp",
        Ok(ImageFormat::Bmp) => "bmp",
        Ok(ImageFormat::Tiff) => "tiff",
        Ok(ImageFormat::Ico) => "ico",
        _ => "unknown",
    };
    
    Ok(ImageInfo {
        width: img.width(),
        height: img.height(),
        format: format.to_string(),
    })
}

#[tauri::command]
fn get_file_stats(file_path: String) -> Result<FileStats, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("文件不存在".to_string());
    }
    
    let metadata = fs::metadata(path)
        .map_err(|e| format!("无法读取文件信息: {}", e))?;
    
    let created = metadata.created()
        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64)
        .unwrap_or(0);
    
    let modified = metadata.modified()
        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64)
        .unwrap_or(0);
    
    Ok(FileStats { created, modified })
}

#[tauri::command]
async fn open_in_explorer(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("文件不存在".to_string());
    }
    
    #[cfg(windows)]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &file_path])
            .spawn()
            .map_err(|e| format!("无法打开资源管理器: {}", e))?;
    }
    
    #[cfg(not(windows))]
    {
        return Err("仅支持 Windows 系统".to_string());
    }
    
    Ok(())
}

#[tauri::command]
async fn delete_file(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("文件不存在".to_string());
    }

    #[cfg(windows)]
    {
        use windows::Win32::UI::Shell::{SHFileOperationW, SHFILEOPSTRUCTW, FO_DELETE, FOF_ALLOWUNDO, FOF_NOCONFIRMATION, FOF_SILENT};
        use windows::Win32::Foundation::{HWND, BOOL};
        use windows::core::PCWSTR;
        use std::ptr;

        let path_wide: Vec<u16> = file_path.encode_utf16().chain(std::iter::once(0)).chain(std::iter::once(0)).collect();
        
        let mut file_op = SHFILEOPSTRUCTW {
            hwnd: HWND::default(),
            wFunc: FO_DELETE,
            pFrom: PCWSTR(path_wide.as_ptr()),
            pTo: PCWSTR::null(),
            fFlags: (FOF_ALLOWUNDO.0 | FOF_NOCONFIRMATION.0 | FOF_SILENT.0) as u16,
            fAnyOperationsAborted: BOOL(0),
            hNameMappings: ptr::null_mut(),
            lpszProgressTitle: PCWSTR::null(),
        };
        
        unsafe {
            let result = SHFileOperationW(&mut file_op);
            if result != 0 {
                return Err(format!("删除文件失败: 错误代码 {}", result));
            }
        }
    }
    
    #[cfg(not(windows))]
    {
        fs::remove_file(path)
            .map_err(|e| format!("删除文件失败: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn delete_folder(folder_path: String) -> Result<(), String> {
    let path = Path::new(&folder_path);
    if !path.exists() {
        return Err("文件夹不存在".to_string());
    }

    if !path.is_dir() {
        return Err("路径不是文件夹".to_string());
    }

    #[cfg(windows)]
    {
        use windows::Win32::UI::Shell::{SHFileOperationW, SHFILEOPSTRUCTW, FO_DELETE, FOF_ALLOWUNDO, FOF_NOCONFIRMATION, FOF_SILENT};
        use windows::Win32::Foundation::{HWND, BOOL};
        use windows::core::PCWSTR;
        use std::ptr;

        let path_wide: Vec<u16> = folder_path.encode_utf16().chain(std::iter::once(0)).chain(std::iter::once(0)).collect();
        
        let mut file_op = SHFILEOPSTRUCTW {
            hwnd: HWND::default(),
            wFunc: FO_DELETE,
            pFrom: PCWSTR(path_wide.as_ptr()),
            pTo: PCWSTR::null(),
            fFlags: (FOF_ALLOWUNDO.0 | FOF_NOCONFIRMATION.0 | FOF_SILENT.0) as u16,
            fAnyOperationsAborted: BOOL(0),
            hNameMappings: ptr::null_mut(),
            lpszProgressTitle: PCWSTR::null(),
        };
        
        unsafe {
            let result = SHFileOperationW(&mut file_op);
            if result != 0 {
                return Err(format!("删除文件夹失败: 错误代码 {}", result));
            }
        }
    }
    
    #[cfg(not(windows))]
    {
        fs::remove_dir_all(path)
            .map_err(|e| format!("删除文件夹失败: {}", e))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_all_files,
            get_thumbnail,
            get_image_info,
            get_file_stats,
            open_in_explorer,
            delete_file,
            delete_folder
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            // 设置窗口图标
            let icon_bytes = include_bytes!("../icons/128x128.png");
            if let Ok(img) = image::load_from_memory(icon_bytes) {
                let rgba = img.into_rgba8();
                let (width, height) = rgba.dimensions();
                let icon = tauri::image::Image::new_owned(rgba.into_raw(), width, height);
                let _ = window.set_icon(icon);
            }
            // 确保窗口可见并获得焦点
            let _ = window.show();
            let _ = window.set_focus();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
