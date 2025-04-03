document.addEventListener('DOMContentLoaded', function () {
  const commonHead = `
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1,user-scalable=0"/>
        <meta name="description" content="">
        <meta name="author" content="">
        <link rel="icon" href="${CONFIG.assets.logo}">
        <!-- Bootstrap core CSS -->
        <link href="https://use.fontawesome.com/releases/v5.0.6/css/all.css" rel="stylesheet">
        <!-- Fonts -->
        <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700,800&display=swap" rel="stylesheet">
        <link href="${CONFIG.assets.css.plugin}" rel="stylesheet">
        <!-- Custom styles for this template -->
        <link href="${CONFIG.assets.css.clockpicker}" rel="stylesheet">
        <link href="${CONFIG.assets.css.style}" rel="stylesheet">
    `;

  const currentTitle = document.title;
  const head = document.head;
  head.innerHTML = `<title>${currentTitle}</title>` + commonHead;

  // Add background div wrapper
  const body = document.body;
  const bodyContent = body.innerHTML;

  // Calculate relative path to style directory
  body.innerHTML = `
    <div class="fullheight">
      ${bodyContent}
      <div class="footer">
        <div class="container">
          <p>
            © 2025
            <a href="#" target="_blank">
              Shrimad Rajchandra Aatma Tatva Research Centre
              </a>
          </p>
        </div>
      </div>
    </div>
  `;
});
