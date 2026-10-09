// Independent named-state oracle: no production imports or native transaction model.
export type MotionAction = 'resting' | 'selected' | 'cancel' | 'set' | 'reduced' | 'full' | 'finish' | 'deactivate' | 'activate';
export function motionOracle() {
    let active = true, reduced = false, reached: string | undefined = 'resting', run: {
        id: number;
        target: string;
    } | undefined;
    const results: {
        id: number;
        result: unknown;
    }[] = [];
    const end = (result: unknown) => { if (run) {
        results.push({ id: run.id, result });
        run = undefined;
    } };
    return { results, step(action: MotionAction, id: number) {
            if (action === 'activate') {
                if (!active) {
                    active = true;
                    reduced = false;
                }
                return;
            }
            if (action === 'resting' || action === 'selected') {
                if (!active) {
                    results.push({ id, result: { status: 'cancelled', target: action, reason: 'deactivated' } });
                    return;
                }
                if (run?.target === action)
                    return;
                if (run)
                    end({ status: 'cancelled', target: run.target, reason: 'superseded' });
                run = { id, target: action };
                if (reduced || reached === action) {
                    reached = action;
                    end({ status: 'finished', target: action, mode: 'immediate' });
                }
                else
                    reached = undefined;
                return;
            }
            if (!active)
                return;
            if (action === 'cancel') {
                if (run) {
                    const target = run.target;
                    reached = undefined;
                    end({ status: 'cancelled', target, reason: 'cancelled' });
                }
            }
            if (action === 'set') {
                if (run)
                    end({ status: 'cancelled', target: run.target, reason: 'set' });
                reached = 'resting';
            }
            if (action === 'reduced') {
                reduced = true;
                if (run) {
                    reached = run.target;
                    end({ status: 'finished', target: run.target, mode: 'immediate' });
                }
            }
            if (action === 'full')
                reduced = false;
            if (action === 'finish' && run) {
                reached = run.target;
                end({ status: 'finished', target: run.target, mode: 'animated' });
            }
            if (action === 'deactivate') {
                active = false;
                if (run) {
                    reached = undefined;
                    end({ status: 'cancelled', target: run.target, reason: 'deactivated' });
                }
            }
        } };
}
