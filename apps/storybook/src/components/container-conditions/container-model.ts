export type ContainerScenario = Readonly<{
    a: Readonly<{
        width: number;
        mounted: boolean;
        key: number;
    }>;
    b: Readonly<{
        width: number;
    }>;
    nested: boolean;
    height: number;
    portal: 'closed' | 'source' | 'destination';
}>;
export type ContainerAction = 'same-bucket' | 'wide' | 'boundary' | 'narrow' | 'unmount' | 'remount' | 'height-tall' | 'height-short' | 'toggle-nested' | 'open-source-portal' | 'open-destination-portal' | 'close-portal';
export function initialContainerScenario(): ContainerScenario { return { a: { width: 176, mounted: true, key: 0 }, b: { width: 288 }, nested: false, height: 120, portal: 'closed' }; }
export function updateContainerScenario(previous: ContainerScenario, action: ContainerAction): ContainerScenario {
    switch (action) {
        case 'same-bucket': return { ...previous, a: { ...previous.a, width: 200 } };
        case 'wide': return { ...previous, a: { ...previous.a, width: 288 } };
        case 'boundary': return { ...previous, a: { ...previous.a, width: 240 } };
        case 'narrow': return { ...previous, a: { ...previous.a, width: 176 } };
        case 'unmount': return { ...previous, a: { ...previous.a, mounted: false } };
        case 'remount': return { ...previous, a: { width: 176, mounted: true, key: previous.a.key + 1 } };
        case 'height-tall': return { ...previous, height: 180 };
        case 'height-short': return { ...previous, height: 120 };
        case 'toggle-nested': return { ...previous, nested: !previous.nested };
        case 'open-source-portal': return { ...previous, portal: 'source' };
        case 'open-destination-portal': return { ...previous, portal: 'destination' };
        case 'close-portal': return { ...previous, portal: 'closed' };
    }
}
