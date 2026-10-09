import {expect,test} from 'bun:test';
import {resolve} from 'node:path';
test('public_animated_stop_sync_cannot_overwrite_immediate_endpoints_or_revive_retired_writes',()=>{
 const child=Bun.spawnSync([process.execPath,resolve(import.meta.dir,'support/motion-animated-probe.ts')],{stdout:'pipe',stderr:'pipe'});
 expect({exitCode:child.exitCode,stderr:child.stderr.toString()}).toEqual({exitCode:0,stderr:''});
 expect(child.stdout.toString()).toContain('retired acknowledgements PASS');
});
