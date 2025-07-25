# fetch-blob-fixed

[![npm version][npm-image]][npm-url]

A Blob implementation in Node.js, originally from [node-fetch](https://github.com/node-fetch/node-fetch).

Use the built-in [`Blob`](https://nodejs.org/docs/latest-v18.x/api/buffer.html#class-blob) in Node.js 18 and later.


This package is a fork from the original `fetch-blob` package, which was deprecated in favor of the built-in `Blob` class in Node.js 18 and later. This fork is maintained for specific use cases that require a polyfill and for packages that already use this implementation. Credit to Jimmy Wärting and other contributors for the original implementation.

Packages should migrate to the built-in `Blob` class in Node.js 18 and later. This package will not be maintained forever. Committing to support through July 2028, after which it will be deprecated.

This package was created to remove deprecated packages from the original `fetch-blob` package and allow it to work with modern Node.js versions when necessary. It is not intended to be a long-term solution. This was made to ensure I did not have deprecated packages in my project.

I also moved this project to `pnpm`, as it is the package manager I use and prefer. It is not a requirement to use this package, but if you develop anything further on top of this, `pnpm` is recommended for consistency.

## Installation

```sh
pnpm install fetch-blob-fixed
```

<details>
  <summary>Differences from other Blobs</summary>

  - Unlike NodeJS `buffer.Blob` (Added in: v15.7.0) and browser native Blob this polyfilled version can't be sent via PostMessage
  - This blob version is more arbitrary, it can be constructed with blob parts that isn't a instance of itself
  it has to look and behave as a blob to be accepted as a blob part.
    - The benefit of this is that you can create other types of blobs that don't contain any internal data that has to be read in other ways, such as the `BlobDataItem` created in `from.js` that wraps a file path into a blob-like item and read lazily (nodejs plans to [implement this][fs-blobs] as well)
  - The `blob.stream()` is the most noticeable differences. It returns a WHATWG stream now. to keep it as a node stream you would have to do:

  ```js
    import {Readable} from 'stream'
    const stream = Readable.from(blob.stream())
  ```
</details>

## Usage

```js
// Ways to import
import { Blob } from 'fetch-blob'
import { File } from 'fetch-blob/file.js'

const { Blob } = await import('fetch-blob')


// Ways to read the blob:
const blob = new Blob(['hello, world'])

await blob.text()
await blob.arrayBuffer()
for await (let chunk of  blob.stream()) { ... }
blob.stream().getReader().read()
blob.stream().getReader({mode: 'byob'}).read(view)
```

### Blob part backed up by filesystem

`fetch-blob/from.js` comes packed with tools to convert any filepath into either a Blob or a File
It will not read the content into memory. It will only stat the file for last modified date and file size.

```js
// The default export is sync and use fs.stat to retrieve size & last modified as a blob
import {File, Blob, blobFrom, blobFromSync, fileFrom, fileFromSync} from 'fetch-blob/from.js'

const fsFile = fileFromSync('./2-GiB-file.bin', 'application/octet-stream')
const fsBlob = await blobFrom('./2-GiB-file.mp4')

// Not a 4 GiB memory snapshot, just holds references
// points to where data is located on the disk
const blob = new Blob([fsFile, fsBlob, 'memory', new Uint8Array(10)])
console.log(blob.size) // ~4 GiB
```

`blobFrom|blobFromSync|fileFrom|fileFromSync(path, [mimetype])`

### Creating a temporary file on the disk
(requires [FinalizationRegistry] - node v14.6)

When using both `createTemporaryBlob` and `createTemporaryFile`
then you will write data to the temporary folder in their respective OS.
The arguments can be anything that [fsPromises.writeFile] supports. NodeJS
v14.17.0+ also supports writing (async)Iterable streams and passing in a
AbortSignal, so both NodeJS stream and whatwg streams are supported. When the
file have been written it will return a Blob/File handle with a references to
this temporary location on the disk. When you no longer have a references to
this Blob/File anymore and it have been GC then it will automatically be deleted.

This files are also unlinked upon exiting the process.
```js
import { createTemporaryBlob, createTemporaryFile } from 'fetch-blob/from.js'

const req = new Request('https://httpbin.org/image/png')
const res = await fetch(req)
const type = res.headers.get('content-type')
const signal = req.signal
let blob = await createTemporaryBlob(res.body, { type, signal })
// const file = createTemporaryBlob(res.body, 'img.png', { type, signal })
blob = undefined // loosing references will delete the file from disk
```

- `createTemporaryBlob(data, { type, signal })`
- `createTemporaryFile(data, FileName, { type, signal, lastModified })`

### Creating Blobs backed up by other async sources
Our Blob & File class are more generic then any other polyfills in the way that it can accept any blob look-a-like item
An example of this is that our blob implementation can be constructed with parts coming from [BlobDataItem](https://github.com/node-fetch/fetch-blob/blob/8ef89adad40d255a3bbd55cf38b88597c1cd5480/from.js#L32) (aka a filepath) or from [buffer.Blob](https://nodejs.org/api/buffer.html#buffer_new_buffer_blob_sources_options), It dose not have to implement all the methods - just enough that it can be read/understood by our Blob implementation. The minium requirements is that it has `Symbol.toStringTag`, `size`, `slice()`, `stream()` methods (the stream method
can be as simple as being a sync or async iterator that yields Uint8Arrays. If you then wrap it in our Blob or File `new Blob([blobDataItem])` then you get all of the other methods that should be implemented in a blob or file (aka: text(), arrayBuffer() and type and a ReadableStream)

An example of this could be to create a file or blob like item coming from a remote HTTP request. Or from a DataBase

See the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/API/Blob) and [tests](https://github.com/node-fetch/fetch-blob/blob/master/test.js) for more details of how to use the Blob.



[npm-url]: https://www.npmjs.com/package/fetch-blob-fixed
