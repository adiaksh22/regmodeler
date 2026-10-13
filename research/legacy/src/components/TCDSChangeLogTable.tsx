import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import { TCDSChangeLog } from '../types/tcds';

const columnHelper = createColumnHelper<TCDSChangeLog>();

const columns = [
  columnHelper.accessor('tcds_id', { header: 'TCDS ID' }),
  columnHelper.accessor('source_url', { 
    header: 'Source URL',
    cell: info => <a href={info.getValue()} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Link</a>
  }),
  columnHelper.accessor('last_checked_at', { 
    header: 'Last Checked',
    cell: info => new Date(info.getValue()).toLocaleString()
  }),
  columnHelper.accessor('content_hash', { header: 'Content Hash' }),
  columnHelper.accessor('last_revision_seen', { header: 'Last Revision' }),
  columnHelper.accessor('last_revision_seen_date', { 
    header: 'Revision Date',
    cell: info => new Date(info.getValue()).toLocaleDateString()
  }),
];

export default function TCDSChangeLogTable({ data }: { data: TCDSChangeLog[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto">
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
