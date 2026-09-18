import { fileContents, find, insert, now, seedId } from './core';

// A visibly marked development PDF, not a legal contract or signed evidence.
export function examplePdf(kind: 'APPROVAL' | 'CONTRACT' | 'REPORT' = 'CONTRACT', lines: string[] = []) {
  const escape = (line: string) =>
    line
      .replaceAll('\\', String.raw`\\`)
      .replaceAll('(', String.raw`\(`)
      .replaceAll(')', String.raw`\)`);
  const stream = `BT /F1 20 Tf 60 740 Td (MOCK ${kind} - DEVELOPMENT ONLY) Tj /F1 12 Tf ${lines.map((line) => `0 -30 Td (${escape(line)}) Tj`).join(' ')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let text = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(text.length);
    text += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = text.length;
  text += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(text);
}
export function seedGovernance() {
  insert('employees', {
    id: seedId(23),
    employeeNo: 'HQ001',
    name: '总部审批员',
    phone: '13800000003',
    jobTitle: '总部管理',
    hiredOn: '2026-01-01',
    status: 'active',
    storeIds: [],
    storeAssignments: [],
  });
  find('accounts', seedId(30)).employeeId = seedId(23);
  const pdf = examplePdf();
  const file = insert('files', {
    id: seedId(401),
    storeId: null,
    uploadedBy: seedId(30),
    originalName: 'mock-contract.pdf',
    mimeType: 'application/pdf',
    byteSize: pdf.length,
    category: 'contract',
    status: 'active',
    storageKey: 'mock-contract-template',
  });
  fileContents.set(file.id, pdf);
  insert('contractTemplates', {
    id: seedId(410),
    templateKey: seedId(410),
    version: 1,
    name: '会员服务合同（示例）',
    fileId: file.id,
    applicableType: 'card',
    reminderDays: 3,
    status: 'published',
  });
  insert('approvalTemplates', {
    id: seedId(420),
    templateKey: seedId(420),
    version: 1,
    name: '私教改价审批',
    businessType: 'price_change',
    steps: [{ stepNo: 1, approverEmployeeId: seedId(23) }],
    status: 'published',
  });
  const approvalTypes = [
    { businessType: 'card_opening', name: '开卡审批', templateId: seedId(15_001) },
    { businessType: 'contract', name: '签约审批', templateId: seedId(15_002) },
  ];
  for (const type of approvalTypes) {
    insert('approvalTemplates', {
      id: type.templateId,
      templateKey: type.templateId,
      version: 1,
      name: type.name,
      businessType: type.businessType,
      steps: [{ stepNo: 1, approverEmployeeId: seedId(23) }],
      status: 'published',
    });
  }
  for (let i = 1; i <= 2; i++) {
    const memberId = seedId(i === 1 ? 101 : 106);
    const storeId = seedId(i);
    const copy = insert('files', {
      ...file,
      id: seedId(401 + i),
      storeId,
      storageKey: `mock-contract-${i}`,
    });
    fileContents.set(copy.id, pdf);
    function attachment(offset: number, name: string, lines: string[]) {
      const contents = examplePdf('APPROVAL', [
        `Store: Shanghai ${i}`,
        `Member: MOCK MEMBER ${i === 1 ? 1 : 6}`,
        ...lines,
        'Sample material only. Not a signed contract or payment receipt.',
      ]);
      const row = insert('files', {
        id: seedId(15_200 + i * 10 + offset),
        storeId,
        uploadedBy: seedId(30 + i),
        originalName: name,
        mimeType: 'application/pdf',
        byteSize: contents.length,
        category: 'approval',
        status: 'active',
        storageKey: `mock-approval-${i}-${offset}`,
      });
      fileContents.set(row.id, contents);
      return { id: row.id, originalName: row.originalName, mimeType: row.mimeType, byteSize: row.byteSize };
    }
    const cardAttachment = attachment(0, '开卡申请单（模拟）.pdf', [
      'Application: monthly membership card',
      'Requested amount: CNY 299.00',
      'Reason: new membership application',
    ]);
    const contractAttachment = attachment(1, '签约审核说明（模拟）.pdf', [
      `Contract: MOCK-CONTRACT-${i}`,
      'Please review the attached membership service agreement.',
      'Review checklist: member details, service period, price and signature fields.',
    ]);
    const priceAttachment = attachment(2, '课程优惠方案（模拟）.pdf', [
      'Product: personal training - 10 sessions',
      'Original price: CNY 2000.00',
      'Requested price: CNY 1800.00',
      'Reason: promotional discount for this application',
    ]);
    insert('contracts', {
      id: seedId(430 + i),
      contractNo: `MOCK-CONTRACT-${i}`,
      memberId,
      storeId,
      templateId: seedId(410),
      unsignedFileId: copy.id,
      status: 'sent',
      sentAt: now(),
      dueAt: new Date(Date.now() - 86_400_000).toISOString(),
      simulated: true,
    });
    insert('contractEvents', {
      id: seedId(440 + i),
      contractId: seedId(430 + i),
      type: 'sent',
      occurredAt: now(),
      payload: { simulated: true },
    });
    insert('approvals', {
      id: seedId(450 + i),
      templateId: seedId(420),
      storeId,
      applicantEmployeeId: seedId(20 + i),
      businessType: 'price_change',
      title: '私教课程改价申请（模拟）',
      attachments: [priceAttachment],
      requestSnapshot: {
        originalPrice: '2000.00',
        requestedPrice: '1800.00',
        reason: '活动申请',
        templateSteps: [{ stepNo: 1, approverEmployeeId: seedId(23) }],
      },
      status: 'pending',
      currentStep: 1,
      submittedAt: now(),
    });
    insert('approvalTasks', {
      id: seedId(460 + i),
      instanceId: seedId(450 + i),
      stepNo: 1,
      approverEmployeeId: seedId(23),
      status: 'pending',
    });
    for (const [index, type] of approvalTypes.entries()) {
      const instanceId = seedId(15_010 + i * 10 + index);
      insert('approvals', {
        id: instanceId,
        templateId: type.templateId,
        storeId,
        memberId,
        applicantEmployeeId: seedId(20 + i),
        businessType: type.businessType,
        title: `${type.name}申请（模拟）`,
        attachments:
          type.businessType === 'card_opening'
            ? [cardAttachment]
            : [
                { id: copy.id, originalName: copy.originalName, mimeType: copy.mimeType, byteSize: copy.byteSize },
                contractAttachment,
              ],
        requestSnapshot: {
          memberName: find('members', memberId).name,
          ...(type.businessType === 'card_opening'
            ? { cardName: '会员月卡（模拟）', cardType: 'period', amount: '299.00' }
            : { contractNo: `MOCK-CONTRACT-${i}`, contractName: '会员服务合同（示例）' }),
          reason: type.businessType === 'card_opening' ? '会员开卡申请' : '会员服务合同签约申请',
          templateSteps: [{ stepNo: 1, approverEmployeeId: seedId(23) }],
        },
        status: 'pending',
        currentStep: 1,
        submittedAt: now(),
        simulated: true,
      });
      insert('approvalTasks', {
        id: seedId(15_110 + i * 10 + index),
        instanceId,
        stepNo: 1,
        approverEmployeeId: seedId(23),
        status: 'pending',
      });
    }
  }
}
