exports.transform = async function(_config, _root, _file, data) {
  const code = data.toString();
  const map = code.split('\n').flatMap((line, index) => [...line.matchAll(/[A-Za-z_$][\w$]*/g)].map(match => [index + 1, match.index, index + 1, match.index, match[0]]));
  return { code, map, output: [{type:"js/module",data:{code,map,lineCount:code.split("\n").length}}] };
};
