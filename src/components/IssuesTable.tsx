import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import { Issue } from '../types/tcds';
import { updateIssueStatus } from '../utils/storageManager';
import {useState} from 'react';

const columnHelper = createColumnHelper<Issue>();

export default function IssuesTable({ data, onUpdate }: { data: Issue[]; onUpdate: () => void }) {
  const [notice,setNotice]=useState('');
  const columns = [
    columnHelper.accessor('tcds_number', { header: 'TCDS Number' }),
    columnHelper.accessor('issue_type', { header: 'Issue Type' }),
    columnHelper.accessor('field_name', { header: 'Field Name' }),
    columnHelper.accessor('table_value', { header: 'Table Value' }),
    columnHelper.accessor('source_value', { header: 'Source Value' }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <select
          aria-label={`Issue status for ${info.row.original.tcds_number} ${info.row.original.field_name}`}
          value={info.getValue()}
          onChange={(e) => {
            try{updateIssueStatus(info.row.original.id, e.target.value as Issue['status']);setNotice('');onUpdate();}
            catch{setNotice('The issue status could not be saved. Existing browser records were preserved.');}
          }}
          className="border rounded px-2 py-1"
        >
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
        </select>
      )
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      {notice&&<p role="status" className="text-sm text-amber-900">{notice}</p>}
      <table className="min-w-full border-collapse border border-gray-300">
        <thead className="bg-gray-100">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="border border-gray-300 px-4 py-2 text-left">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="border border-gray-300 px-4 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
