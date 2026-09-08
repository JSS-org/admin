import { find, insert, now, seedId } from './core';

export function seedTraining() {
  for (let i = 1; i <= 2; i++) {
    const storeId = seedId(i);
    const coachId = seedId(20 + i);
    const memberId = seedId(i === 1 ? 101 : 106);
    insert('coachProfiles', {
      id: seedId(300 + i),
      employeeId: coachId,
      biography: '示例教练',
      specialties: ['力量', '团课'],
      qualifications: [],
      status: 'active',
    });
    insert('courseProducts', {
      id: seedId(310 + i),
      storeId,
      name: '基础团课',
      kind: 'group',
      description: '基础力量与体能',
      sessionCount: 10,
      durationMinutes: 60,
      price: '299.00',
      status: 'active',
    });
    insert('courseProducts', {
      id: seedId(320 + i),
      storeId,
      name: '私教十次课程',
      kind: 'personal',
      description: '一对一训练',
      sessionCount: 10,
      durationMinutes: 60,
      price: '2000.00',
      status: 'active',
    });
    insert('memberCoursePacks', {
      id: seedId(330 + i),
      memberId,
      storeId,
      courseProductId: seedId(320 + i),
      name: '私教十次课程',
      assignedCoachId: coachId,
      totalSessions: 10,
      remainingSessions: 9,
      reservedSessions: 0,
      startsAt: new Date(Date.now() - 86_400_000).toISOString(),
      expiresAt: new Date(Date.now() + 60 * 86_400_000).toISOString(),
      status: 'active',
      productSnapshot: { ...find('courseProducts', seedId(320 + i)) },
    });
    const startsAt = new Date(Date.now() + i * 86_400_000).toISOString();
    const endsAt = new Date(Date.parse(startsAt) + 3_600_000).toISOString();
    insert('courseSessions', {
      id: seedId(340 + i),
      storeId,
      courseProductId: seedId(310 + i),
      coachId,
      room: '操课室',
      startsAt,
      endsAt,
      capacity: 20,
      status: 'scheduled',
    });
    const previous = new Date(Date.now() - 3_600_000).toISOString();
    insert('courseSessions', {
      id: seedId(350 + i),
      storeId,
      courseProductId: seedId(320 + i),
      coachId,
      room: '私教区',
      startsAt: previous,
      endsAt: now(),
      capacity: 1,
      status: 'completed',
    });
    insert('bookings', {
      id: seedId(360 + i),
      memberId,
      storeId,
      sessionId: seedId(350 + i),
      memberCoursePackId: seedId(330 + i),
      status: 'attended',
      bookedAt: previous,
      source: 'miniapp',
      note: '模拟历史记录',
    });
    insert('checkins', {
      id: seedId(370 + i),
      memberId,
      storeId,
      memberCardId: seedId(i === 1 ? 201 : 206),
      enteredAt: previous,
      exitedAt: null,
      method: 'face',
      status: 'succeeded',
      visitorType: 'member',
      sourceKey: `seed-checkin-${i}`,
    });
    insert('lessonRecords', {
      id: seedId(380 + i),
      bookingId: seedId(360 + i),
      memberId,
      storeId,
      coachId,
      checkinId: seedId(370 + i),
      sessionUnits: 1,
      method: 'face',
      status: 'confirmed',
      confirmedAt: previous,
    });
    insert('bodyMeasurements', {
      id: seedId(390 + i),
      memberId,
      storeId,
      employeeId: coachId,
      measuredAt: previous,
      heightCm: '175.000',
      weightKg: '70.000',
      bodyFatPercent: '20.000',
      muscleMassKg: '30.000',
      measurements: [],
      note: '首次体测',
      createdBy: seedId(30),
      updatedBy: seedId(30),
    });
  }
}
