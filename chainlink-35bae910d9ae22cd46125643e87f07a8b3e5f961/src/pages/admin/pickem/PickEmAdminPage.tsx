import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import PickEmCampaignsList from './PickEmCampaignsList';
import PickEmCreateCampaign from './PickEmCreateCampaign';
import PickEmCampaignDetail from './PickEmCampaignDetail';

export default function PickEmAdminPage() {
  return (
    <Routes>
      <Route path="/" element={<PickEmCampaignsList />} />
      <Route path="/create" element={<PickEmCreateCampaign />} />
      <Route path="/campaign/:id" element={<PickEmCampaignDetail />} />
    </Routes>
  );
}
