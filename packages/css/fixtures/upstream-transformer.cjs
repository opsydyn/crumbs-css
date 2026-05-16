exports.transform = async function transform(_config, _projectRoot, _filename, data) {
  return {
    code: data.toString(),
  }
}
