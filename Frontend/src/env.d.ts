interface ImportMetaEnv {
      VITE_ADMIN_PANEL_URL: string | undefined;
      readonly VITE_BACKEND_URL: string;
    }
    
    interface ImportMeta {
      readonly env: ImportMetaEnv;
    }