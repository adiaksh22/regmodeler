import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import { TCDSChangeLogEntry } from '../types/tcds';

const columnHelper = createColumnHelper<TCDSChangeLogEntry>();

const columns = [
  columnHelper.accessor('tcds_number', { header: 'TCDS Number' }),
  columnHelper.accessor('detected_at', {
    header: 'Detected At',
    cell: info => new Date(info.getValue()).toLocaleString()
  }),
  columnHelper.accessor('change_type', { header: 'Change Type' }),
  columnHelper.accessor('summary', { header: 'Summary' }),
  columnHelper.accessor('old_hash', {
    header: 'Old Hash',
    cell: info => info.getValue().substring(0, 8)
  }),
  columnHelper.accessor('new_hash', {
    header: 'New Hash',
    cell: info => info.getValue().substring(0, 8)
  }),
];

export default function ChangeLogEntriesTable({ data }: { data: TCDSChangeLogEntry[] }) {
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
