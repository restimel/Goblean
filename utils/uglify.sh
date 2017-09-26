#!/bin/bash

if ! type "uglifyjs" >& /dev/null; then
  echo ""
  echo "uglify is not installed yet."
  echo "Type 'npm install uglify-js -g' to install it."
  echo ""
  exit 1
fi

# https://github.com/mishoo/UglifyJS2
uglifyjs scripts/goblean.js scripts/fighter.js scripts/indexDB.js -cm --preamble="/* https://github.com/restimel/Goblean */" -o goblean.min.js &&

echo "goblean.min.js has been generated" ||
echo "Minification has failed. goblean.min.js was not generated!"
