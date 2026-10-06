import React, { useState } from 'react';
import ShotCamReviewCard, { type ShotCamSubmission } from '../components/shame/ShotCamReviewCard';

export const ShotCamPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<ShotCamSubmission[]>([
    {
      id: 'sub_demo_01',
      userId: 'user_alice',
      username: 'Alice Cooper',
      status: 'COMMISSIONER_AUDIT',
      fineAmount: 2.5,
      isDeadPlaceMonarch: true,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      disputeDeadline: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      id: 'sub_demo_02',
      userId: 'user_bob',
      username: 'Bob Martinez',
      status: 'VERIFIED',
      fineAmount: 1.0,
      isDeadPlaceMonarch: false,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      disputeDeadline: new Date(Date.now() + 86400000).toISOString(),
    },
  ]);

  const handleApprove = async (id: string) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'VERIFIED' } : s))
    );
  };

  const handleDispute = async (id: string) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'DISPUTED' } : s))
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">📸 Shot-Cam Verification Hub</h1>
        <p className="text-slate-400 mt-2">
          Verify and dispute weekly shot penalty submissions with tamper-proof audit trails (Decision #65).
        </p>
      </div>

      <ShotCamReviewCard
        submissions={submissions}
        isCommissioner={true}
        tenantId="main_tenant"
        poolId="Main League"
        onApprove={handleApprove}
        onDispute={handleDispute}
        isFeatureActive={true}
      />
    </div>
  );
};
