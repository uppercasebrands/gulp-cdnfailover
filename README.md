# gulp-cdnfailover
gulp-cdnfailover is a [gulp](https://github.com/wearefractal/gulp) plugin to create HTML snippets that will try to load your JS/CSS sources from CDN locations and if there are any errors, it fails over to local sources. The HTML snippets for javascript are synchronous/blocking where as the CSS snippet will make its best effort to load the local files as quickly as possible. 

## Features ##

* **Failover HTML snippet:** Creates failover HTML snippet for both JS and CSS
* **Integrity and crossOrigin:** Both of these attributes are supported.
* **Replaces placeholders in HTML file:** And outputs the file where the snippets are placed.

## Usage

Install `gulp-cdnfailover` as a development dependency:

```shell
npm install --save-dev gulp-cdnfailover
```

Add it to your `gulpfile.js`:

```javascript
var cdnfailover = require("gulp-cdnfailover");

gulp.src("./src/index.html")
 .pipe(cdnfailover({
      verbose: true,
      uselocalfilesonly: false,
      files: [{ name: 'jquery-slim-min-js',
                local: 'js/jquery/dist/jquery.slim.min.js',
                cdn: 'https://code.jquery.com/jquery-3.2.1.slim.min.js',
                cdnintegrity: 'sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN',
                cdncrossorigin: 'anonymous'},
              { name: 'bootstrap-min-css',
                local: 'css/bootstrap/dist/css/bootstrap.min.css',
                cdn: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css',
                cdnintegrity:  'sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u',
                cdncrossorigin:  'anonymous'}]}))
  .pipe(gulp.dest("./dist")); 
```

The module looks for `<!-- cdnfailover:NAME_OF_ENTRY -->` line and replaces with the appropriate snippet. It automatically detects if it is a JS or a CSS resource by checking the extension of the local. 

For the example above, your src/index.html should have these lines: `<!-- cdnfailover:bootstrap-min-css -->` and `<!-- cdnfailover:jquery-slim-min-js -->`

Example:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <!-- cdnfailover:bootstrap-min-css -->
  </head>
  <body>
  <!-- Placed at the end of the document so the pages load faster -->
  <!-- cdnfailover:jquery-slim-min-js -->
  </body>
</html>
```

The output will look like this:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <link rel=​"stylesheet" href=​"https:​/​/​maxcdn.bootstrapcdn.com/​bootstrap/​3.3.7/​css/​bootstrap.min.css" integrity=​"sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/​K68vbdEjh4u" crossorigin=​"anonymous">​<script>​var e=document.styleSheets[document.styleSheets.length-1];if(typeof e==="undefined"||e.href!=="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css"||((!e.cssRules||!e.cssRules.length)&&(!e.rules||!e.rules.length)))(function(){var e=document.createElement("link");e.rel="stylesheet",e.href="css/bootstrap/dist/css/bootstrap.min.css",document.head.appendChild(e)})();</script>
  </head>
  <body>
  <!-- Placed at the end of the document so the pages load faster -->
  <script src=​"https:​/​/​code.jquery.com/​jquery-3.2.1.slim.min.js" integrity=​"sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/​rE9/​Qpg6aAZGJwFDMVNA/​GpGFF93hXpG5KkN" crossorigin=​"anonymous" onerror=​"(typeof cdnfailover==='undefined')​?cdnfailover={_1:​true}​:​cdnfailover._1=true">​</script><script>(typeof cdnfailover!== 'undefined')&&cdnfailover.hasOwnProperty(_1)&&document.write('<script src="js/jquery/dist/jquery.slim.min.js"><\/script>');</script>
  </body>
</html>
```

## Options

#### verbose
Type: `Boolean`

If `true`, log verbose while running.

#### uselocalfilesonly
Type: `Boolean`

If `true`, we don't do any of these tricks in this extension. We simply output a <script> or <link> tag pointing to the local copy. This is useful when you are developing a webpage offline and you dont want your browser to wait for the css/js files while developing. Defaults to false. 


#### files
Type: `Array`

Define entries that will be used to create the HTML snippets

#### files.name
Type: `String`

Name of the file entry. This name will be used to match a comment line in the source HTML file. This comment line will be replaced with an HTML snippet. The comment line has the format of: `<!-- cdnfailover:FILES.NAME -->`. For example, if `name='bootstrap.min.js'`, then the comment line should be `<!-- cdnfailover:bootstrap.min.js -->`

#### files.cdn
Type: `String`

CDN location of the source.

#### files.cdncrossorigin
Type: `String`

crossOrigin attribute of CDN location of the source.

#### files.cdnintegrity
Type: `String`

integrity attribute CDN location of the source.

#### files.local
Type: `String`

Local location of the source.

Example:
``` javascript
{
  verbose: true,
  files: [{ name: 'jquery-slim-min-js',
            local: 'js/jquery/dist/jquery.slim.min.js',
            cdn: 'https://code.jquery.com/jquery-3.2.1.slim.min.js',
            cdnintegrity: 'sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN',
            cdncrossorigin: 'anonymous'}
          ]
}
```

## Notes

We use the following algorithm to detect whether JS or CSS has been successfully downloaded by the browser.

1) JS: We listen for 'onerror' event on the <script> element of the JS source.
         If onerror fires, we set up a unique id under window.cdnfailover object.
         In the following script tag, we check for the existence of the id. If id
         is there, we 'document.write' another <script> tag with the local source.
2) CSS: We check for the last element of document.styleSheets. If this last element
         has a different href attribute than our file, or if it has zero rules(and
         cssRules), then we insert a new link element with the local source under
         document.head.

* WARNING: If your CDN CSS source has ONLY at-rules (eg. @viewport), then our CSS algorithm will always fail to detect that CDN source has successfully downloaded. CSS at-rules are not parsed into styleSheet objects by browsers.


## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)

## Contact

Reach us at [Uppercase Brands](http://uppercasebrands.com)