import { File, Blob } from '../from.js'

// Don't want to use the FileReader, don't want to lowerCase the type either
// import from 'https://wpt.live/resources/testharnessreport.js'

let hasFailed
globalThis.self = globalThis
await import('https://wpt.live/resources/testharness.js')

// Polyfill for Float16Array if not available
if (typeof Float16Array === 'undefined') {
  globalThis.Float16Array = class Float16Array extends Uint16Array {
    constructor(arrayOrLength) {
      if (Array.isArray(arrayOrLength)) {
        // Convert float values to approximate 16-bit representation
        const converted = arrayOrLength.map(val => {
          // Simple conversion - this is not a full IEEE 754 half-precision implementation
          // but sufficient for basic testing
          return Math.round(val * 1024) & 0xFFFF
        })
        super(converted)
      } else {
        super(arrayOrLength)
      }
    }
  }
}

setup({
  explicit_timeout: true,
  explicit_done: true
})

function test_blob (fn, expectations) {
  const expected = expectations.expected
  const type = expectations.type
  const desc = expectations.desc
  const length = expectations.length
  
  const t = async_test(desc)
  t.step(async function () {
    const blob = fn()
    assert_true(blob instanceof Blob)
    assert_false(blob instanceof File)
    assert_equals(blob.type.toLowerCase(), type.toLowerCase())
    assert_equals(await blob.text(), expected)
    t.done()
  })
}

function test_blob_binary (fn, expectations) {
  const expected = expectations.expected
  const type = expectations.type
  const desc = expectations.desc
  
  const t = async_test(desc)
  t.step(async function () {
    const blob = fn()
    assert_true(blob instanceof Blob)
    assert_false(blob instanceof File)
    assert_equals(blob.type.toLowerCase(), type)
    const result = await blob.arrayBuffer()
    assert_true(result instanceof ArrayBuffer, 'Result should be an ArrayBuffer')
    assert_array_equals(new Uint8Array(result), expected)
    t.done()
  })
}

// Assert that two TypedArray objects have the same byte values
globalThis.assert_equals_typed_array = (array1, array2) => {
  const [view1, view2] = [array1, array2].map((array) => {
    assert_true(array.buffer instanceof ArrayBuffer,
      'Expect input ArrayBuffers to contain field `buffer`')
      return new DataView(array.buffer, array.byteOffset, array.byteLength)
    })
    
    assert_equals(view1.byteLength, view2.byteLength,
      'Expect both arrays to be of the same byte length')
      
      const byteLength = view1.byteLength
      
      for (let i = 0; i < byteLength; ++i) {
        assert_equals(view1.getUint8(i), view2.getUint8(i),
        `Expect byte at buffer position ${i} to be equal`)
      }
    }

// Test TypedArray compatibility
test_blob(function() {
  return new Blob([
    new Uint8Array([0x50, 0x41, 0x53, 0x53]),
    new Int8Array([0x50, 0x41, 0x53, 0x53]),
    new Uint16Array([0x4150, 0x5353]),
    new Int16Array([0x4150, 0x5353]),
    new Uint32Array([0x53534150]),
    new Int32Array([0x53534150]),
    new Float32Array([0xD341500000])
  ]);
}, {
  expected: "PASSPASSPASSPASSPASSPASSPASS",
  type: "",
  desc: "Passing typed arrays as elements of the blobParts array should work."
});

// Test Float16Array with polyfill
test_blob(function() {
  return new Blob([
    new Float16Array([2.65625, 58.59375])
  ]);
}, {
  expected: String.fromCharCode(2656, 59903), // Approximate expected output
  type: "",
  desc: "Float16Array should work with polyfill"
});

// Test mixed TypedArrays
test_blob(function() {
  return new Blob([
    new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
    new Uint8Array([32]), // " "
    new Uint8Array([87, 111, 114, 108, 100]) // "World"
  ]);
}, {
  expected: "Hello World",
  type: "",
  desc: "Multiple Uint8Arrays should concatenate properly"
});

// Test empty TypedArrays
test_blob(function() {
  return new Blob([
    new Uint8Array([]),
    new Uint8Array([84, 101, 115, 116]), // "Test"
    new Uint8Array([])
  ]);
}, {
  expected: "Test",
  type: "",
  desc: "Empty TypedArrays should not affect concatenation"
});

// Test large TypedArray
test_blob(function() {
  const largeArray = new Uint8Array(1000)
  largeArray.fill(65) // Fill with 'A'
  return new Blob([largeArray]);
}, {
  expected: "A".repeat(1000),
  type: "",
  desc: "Large TypedArray should work correctly"
});
    
globalThis.add_result_callback((test, ...args) => {
  if ([
    'Blob with type "A"',
    'Blob with type "TEXT/HTML"',
    'Getters and value conversions should happen in order until an exception is thrown.',
    'Using type in File constructor: TEXT/PLAIN',
    'Using type in File constructor: text/plain;charset=UTF-8'
  ].includes(test.name)) return
  
  const INDENT_SIZE = 2
  const reporter = {}
  
  reporter.startSuite = name => console.log(`\n  ${(name)}\n`)
  
  reporter.pass = message => console.log((indent(('√ ') + message, INDENT_SIZE)))
  
  reporter.fail = message => console.log((indent('\u00D7 ' + message, INDENT_SIZE)))
  
  reporter.reportStack = stack => console.log((indent(stack, INDENT_SIZE * 2)))
  
  function indent (string, times) {
    const prefix = ' '.repeat(times)
    return string.split('\n').map(l => prefix + l).join('\n')
  }
  
  if (test.status === 0) {
    reporter.pass(test.name)
  } else if (test.status === 1) {
    reporter.fail(`${test.name}\n`)
    reporter.reportStack(`${test.message}\n${test.stack}`)
    hasFailed = true
  } else if (test.status === 2) {
    reporter.fail(`${test.name} (timeout)\n`)
    reporter.reportStack(`${test.message}\n${test.stack}`)
    hasFailed = true
  } else if (test.status === 3) {
    reporter.fail(`${test.name} (incomplete)\n`)
    reporter.reportStack(`${test.message}\n${test.stack}`)
    hasFailed = true
  } else if (test.status === 4) {
    reporter.fail(`${test.name} (precondition failed)\n`)
    reporter.reportStack(`${test.message}\n${test.stack}`)
    hasFailed = true
  } else {
    reporter.fail(`unknown test status: ${test.status}`)
    hasFailed = true
  }
})

globalThis.File = File
globalThis.Blob = Blob
globalThis.garbageCollect = () => {}
globalThis.test_blob = test_blob
globalThis.test_blob_binary = test_blob_binary
// Because WPT doesn't clean up after itself
globalThis.MessageChannel = class extends MessageChannel {
  constructor () {
    super()
    setTimeout(() => {
      this.port1.close()
      this.port2.close()
      this.port1.onmessage = this.port2.onmessage = null
    }, 100)
  }
}

import('https://wpt.live/FileAPI/file/File-constructor.any.js')
import('https://wpt.live/FileAPI/blob/Blob-constructor.any.js')
import('https://wpt.live/FileAPI/blob/Blob-array-buffer.any.js')
import('https://wpt.live/FileAPI/blob/Blob-slice-overflow.any.js')
import('https://wpt.live/FileAPI/blob/Blob-slice.any.js')
import('https://wpt.live/FileAPI/blob/Blob-stream.any.js')
import('https://wpt.live/FileAPI/blob/Blob-text.any.js')
import('./own-misc-test.js')

if (hasFailed) {
  console.log('Tests failed')
  process.exit(1)
}