import puppeteer from 'puppeteer'

let headless = true
let disconnect
let timeout = 1000
let arg
for (let i = 2, { argv } = process, { length } = argv; i < length; ++i) {
  arg = argv[i]
  switch (arg) {
    case '--no-headless':
      headless = false
      continue
    case '--disconnect':
      disconnect = true
      continue
  }
  if (arg.startsWith('--timeout=')) {
    timeout = +arg.substring(10)
    continue
  }
  break
}
if (!arg) throw new Error('missing URL')

const collect = page => {
  return new Promise((resolve, reject) => {
    let worked, failed
    page
      .on('console', message => {
        const text = message.text()
        console.log(text)
        worked = true
        if (text.startsWith('not ok'))
          failed = true
        else if (text.match(/^\d+\.\.\d+$/))
          if (failed) reject()
          else resolve()
      })
      .on('pageerror', ({ message }) => {
        console.error(message)
        failed = true
      })
      .on('requestfailed', request => {
        console.log(`${request.failure().errorText} ${request.url()}`)
        failed = true
      })
  })
}

const wait = time => {
  let timeout
  const promise = new Promise((resolve, reject) => timeout = setTimeout(reject, time))
  promise.abort = () => clearTimeout(timeout)
  return promise
}

let browser, waiting
try {
  browser = await puppeteer.launch({ headless })
  const page = await browser.newPage()
  const collecting = collect(page)
  await page.goto(`file://${process.cwd()}/${arg}`)
  waiting = wait(timeout)
  await Promise.race([collecting, waiting])
} catch (error) {
  if (error) console.error(error)
  process.exitCode = 1
} finally {
  if (waiting) waiting.abort()
  if (browser)
    if (disconnect) browser.disconnect()
    else browser.close()
}
