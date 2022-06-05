require('@prantlf/dom-lite/global')
document.implementation = {
  createHTMLDocument() {
    return new Document()
  }
}
global.window = {
  document,
  setTimeout,
  location: {
    href: ''
  }
}

global.tehanu = require('tehanu')
global.tehanuTeas = require('tehanu-teas')

global.AsyncTaskQueue = require('..')

require('./iife')
