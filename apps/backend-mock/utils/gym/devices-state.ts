import { insert, now, seedId } from './core';
export function seedDevices() {
  for (let i = 1; i <= 2; i++) {
    const storeId = seedId(i);
    insert('devices', {
      id: seedId(500 + i),
      storeId,
      name: '入口门禁（模拟）',
      type: 'door',
      provider: 'mock',
      deviceUid: `MOCK-DOOR-${i}`,
      location: '入口',
      doorMode: 'normal',
      status: 'active',
      lastSeenAt: now(),
      capabilities: ['open_door'],
    });
    insert('devices', {
      id: seedId(510 + i),
      storeId,
      name: '储物柜（模拟）',
      type: 'locker',
      provider: 'mock',
      deviceUid: `MOCK-LOCKER-${i}`,
      location: '更衣区',
      status: 'active',
      lastSeenAt: now(),
      capabilities: ['open_locker'],
    });
    for (let n = 1; n <= 3; n++)
      insert('compartments', {
        id: seedId(520 + i * 10 + n),
        deviceId: seedId(510 + i),
        number: String(n).padStart(3, '0'),
        status: 'available',
      });
    insert('equipment', {
      id: seedId(550 + i),
      storeId,
      code: `EQ-${i}`,
      name: '史密斯训练器',
      model: 'SM-01',
      status: 'active',
    });
  }
}
