/**
 * @copyright Copyright (c) 2017 All Rights Reserved.
 * @author Uppercase Brands Engineering  <eng@uppercasebrands.com>
 *
 * gulp-cdnfailover
 *
 * Copyright (c) 2017 Uppercase Brands LLC
 * Licensed under the MIT license.
 * https://github.com/uppercasebrands/gulp-cdnfailover/blob/master/LICENSE.txt
 *
 * We use the following algorithm to detect whether JS or CSS has been successfully
 * downloaded by the browser. 
 * 1) JS: We listen for 'onerror' event on the <script> element of the JS source. 
 *        If onerror fires, we set up a unique id under window.cdnfailover object.
 *        In the following script tag, we check for the existence of the id. If id
 *        is there, we 'document.write' another <script> tag with the local source.
 * 2) CSS: We check for the last element of document.styleSheets. If this last element
 *         has a different href attribute than our file, or if it has zero rules(and
 *         cssRules), then we insert a new link element with the local source under
 *         document.head.
 *
 * WARNING: If your CDN CSS source has ONLY at-rules (eg. @viewport), then our CSS algorithm
 *          will always fail to detect that CDN source has successfully downloaded. CSS at-rules
 *          are not parsed into styleSheet objects. 
 */
'use strict';

var applause = require('applause'),
    gutil = require('gulp-util'),
    through2 = require('through2');

/**
 * Builds javascript element from an entry object. The entry object
 * is expected to have these attributes: name, cdn, local, cdnintegrity,
 * cdncrossorigin.
 *
 * @param {entry} elem - entry object
 * @param {integer} i - the id to use in the cdnfailover variable.
 * @param {boolean} uselocalfilesonly - if uselocalfilesonly, returns a simple entry that refers to the local file.
 * @return {string} html snippet which downloads the cdn javascript source
 *                   and fails over to the local link if there are any errors.
 * @example
 * buildJSOutput({ name: 'bootstrap-min-js',
 *                local: 'js/bootstrap/dist/js/bootstrap.min.js',
 *                cdn: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js',
 *                cdnintegrity: 'sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa',
 *                cdncrossorigin: 'anonymous'}, 22);
 * // outputs:
 *  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"
 *   integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa"
 *   crossorigin="anonymous" onerror="(typeof cdnfailover==='undefined')?cdnfailover={_1:true}:cdnfailover._1=true">
 *   </script><script>(typeof cdnfailover!== 'undefined')&&cdnfailover.hasOwnProperty(_1)&&document.write(
 *   '<script src="js/bootstrap/dist/js/bootstrap.min.js"><\/script>');</script>
 */
function buildJSOutput(elem, i, uselocalfilesonly) {
  var cdn = elem.cdn || '',
      local = elem.local || '';

  if (uselocalfilesonly !== undefined && uselocalfilesonly) {
    return '<script src="{0}" ></script>'.replace('{0}', local);;
  }
  
  var output = '<script src="' + cdn + '" ';

  if (elem.cdnintegrity) {
    output += 'integrity="' + elem.cdnintegrity + '" ';
  }
  if (elem.cdncrossorigin) {
    output += 'crossorigin="' + elem.cdncrossorigin + '" ';
  }
  output += 'onerror="(typeof cdnfailover===\'undefined\')' +
    '?cdnfailover={_' + i + ':true}:cdnfailover._' + i + '=true">';
  output += '</script><script>(typeof cdnfailover!== \'undefined\')&&cdnfailover.hasOwnProperty(\'_' + i +
    '\')&&document.write(\'<script src="' + local + '"><\\/script>\');</script>';
  return output;
}


/**
 * Builds css element from an entry object. The entry object
 * is expected to have these attributes: name, cdn, local, cdnintegrity,
 * cdncrossorigin.
 *
 * @param {entry} elem - entry object
 * @param {boolean} uselocalfilesonly - if uselocalfilesonly, returns a simple entry that refers to the local file.
 * @return {string} html snippet which downloads the cdn css source
 *                  and fails over to the local link if there are any errors.
 * @example
 * buildCSSOutput({ name: 'bootstrap-min-css',
 *                  local: 'css/bootstrap/dist/css/bootstrap.min.css',
 *                  cdn: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css',
 *                  cdnintegrity:  'sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u',
 *                  cdncrossorigin:  'anonymous'});
 * // outputs:
 *  <link rel=​"stylesheet" href=​"https:​/​/​maxcdn.bootstrapcdn.com//​bootstrap/​3.3.7/​css/​bootstrap.min.css" 
 *   integrity=​"sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/​K68vbdEjh4u" crossorigin=​"anonymous">
 *   <script>​var e=document.styleSheets[document.styleSheets.length-1];if(typeof e==="undefined"||e.href!=="https://
 *   maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css"||((!e.cssRules||!e.cssRules.length)&&(!e.rules||
 *   !e.rules.length)))(function(){var e=document.createElement("link");e.rel="stylesheet",e.href="css/bootstrap/dist
 *   /css/bootstrap.min.css",document.head.appendChild(e)})();</script>​
 */
function buildCSSOutput(elem, uselocalfilesonly) {
  var cdn = elem.cdn || '',
      local = elem.local || '';

  // If we are not online, just return the link to the local copy.
  if (uselocalfilesonly !== undefined && uselocalfilesonly) {
    return '<link rel="stylesheet" href="{0}">'.replace('{0}', local);
  }
  
  // We are online, so we send the 
  var output = '<link rel="stylesheet" href="{0}" '.replace('{0}', cdn);

  if (elem.cdnintegrity) {
    output += 'integrity="' + elem.cdnintegrity + '" ';
  }
  if (elem.cdncrossorigin) {
    output += 'crossorigin="' + elem.cdncrossorigin + '" ';
  }
  output += '><script>var e=document.styleSheets[document.styleSheets.length-1];if(typeof e==="undefined"||e.href!=="' +
    cdn + '"||((!e.cssRules||!e.cssRules.length)&&(!e.rules||!e.rules.length)))(function(){var e=document.createElement(' +
    '"link");e.rel="stylesheet",e.href="' + local + '",document.head.appendChild(e)})();</script>';
  return output;
}

// Exports the main function for gulp module
module.exports = function (options) {
  var verbose  = options && options.verbose,
      uselocalfilesonly = options && options.uselocalfilesonly,
      module_name = 'gulp-cdnfailover',  
      loginfo = function () {
        if (verbose) {
          arguments[0] = module_name + ":" + arguments[0];
          gutil.log.apply(this, arguments);
        }
      },
      applauseOptions = { patterns: [],
                          prefix: '<!-- cdnfailover:'},
      names = [];
  if (options && options.files) {
    for (var i = 0; i < options.files.length; i++) {
      var elem = options.files[i];
      if (elem.name) {
        applauseOptions.patterns.push(
          {
            match: elem.name + ' -->',
            replacement: elem.cdn.endsWith('css') ? buildCSSOutput(elem, uselocalfilesonly) : buildJSOutput(elem, i, uselocalfilesonly)
          }
        );
        names.push(elem.name);
      }
    }
  }
  loginfo('options has %d entries with nonempty name:%s', names.length, names);

  return through2.obj(function (file, unused, callback) {
    if (file.isNull()) {
      this.push(file); // do nothing if no contents
    } else if (file.isStream()) {
      this.emit('error', new gutil.PluginError(module_name, 'Streaming not supported'));
    } else if (file.isBuffer()) {
      var contents = file.contents.toString(),
          result = applause.create(applauseOptions).replace(contents);
      if (result && result.content) {
        loginfo('successfully replaced %d patterns', result.count);
        file.contents = new Buffer(result.content);
      }
      this.push(file);
    }
    callback();
  });
}
