const CONFIG = {
  //basePath: 'http://127.0.0.1:3000/api/v1/admin', // Set this to your base URL if needed
  basePath: '${CONFIG.basePath}',

  adminHomePath: '/admin/adminhome.html',
  assets: {
    logo: '/assets/images/logo.png',
    images: {
      background: '/style/images/RC_Blur.png'
    },
    css: {
      plugin: '/style/css/plugin.css',
      clockpicker: '/style/css/clockpicker.css',
      style: '/style/css/style.css'
    }
  }
};
