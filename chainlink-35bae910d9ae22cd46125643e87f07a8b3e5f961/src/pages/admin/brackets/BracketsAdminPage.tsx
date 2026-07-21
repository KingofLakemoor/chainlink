import React from 'react';
import { Routes, Route } from 'react-router-dom';
import BracketsList from './BracketsList';
import CreateBracket from './CreateBracket';
import EditBracket from './EditBracket';
import BracketEntriesAdminPage from './BracketEntriesAdminPage';

export default function BracketsAdminPage() {
  return (
    <Routes>
      <Route path="/" element={<BracketsList />} />
      <Route path="/create" element={<CreateBracket />} />
      <Route path="/edit/:id" element={<EditBracket />} />
      <Route path="/entries/:id" element={<BracketEntriesAdminPage />} />
    </Routes>
  );
}
