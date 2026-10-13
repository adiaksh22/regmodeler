import React, { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

// Direct TCDS document URLs - auto-scraped from FAA DRS
const tcdsDirectUrls: Record<string, string> = {
  'ATC 42 Textron Lycoming': 'https://drs.faa.gov/browse/excelExternalWindow/0001847EDB0CEBC6862572C0006DF231.0001',
  'P19NE': 'https://drs.faa.gov/browse/excelExternalWindow/65F15764601662218625870C00615523.0001',
  'E7CE': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID148994589720230223190439.0001',
  'TC 653': 'https://drs.faa.gov/browse/excelExternalWindow/2A14A98048AD259185256732004CC273.0001',
  'A14SO': 'https://drs.faa.gov/browse/excelExternalWindow/E7C26AA9AFF64B19862577AB0068F180.0001',
  'E4IN': 'https://drs.faa.gov/browse/excelExternalWindow/B3F869AEB5125DDD862588C6006584BE.0001',
  'E5NE': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID172085135620231129203524.0001',
  'E-274': 'https://drs.faa.gov/browse/excelExternalWindow/74C397F0D8FA23B886257B63006BA6A4.0001',
  'A-804': 'https://drs.faa.gov/browse/excelExternalWindow/E0F93CB70D35CD3D862582B000711E18.0001',
  'H5EU': 'https://drs.faa.gov/browse/excelExternalWindow/0055C6C3A81C26CA852567150063E527.0001',
  'TC 534': 'https://drs.faa.gov/browse/excelExternalWindow/00563BC477C1164F8525676A0062B84B.0001',
  'A10SW': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID117770915220230412140907.0001',
  'A00010WI': 'https://drs.faa.gov/browse/excelExternalWindow/6B9B373799E138BE862585BB0064BA05.0001',
  'A16SO': 'https://drs.faa.gov/browse/excelExternalWindow/00617D2BC06FF1908525673F00623C50.0001',
  'E00069EN': 'https://drs.faa.gov/browse/excelExternalWindow/6090A0C0AF2245CF8625887C0049BD46.0001',
  '2A13': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID125895332520251113164724.0001',
  'G17CE': 'https://drs.faa.gov/browse/excelExternalWindow/0084B54070EC232A8625879E0073F2FE.0001',
  'A41EU': 'https://drs.faa.gov/browse/excelExternalWindow/2AFED1F41EABF2CB8625848700475D3C.0001',
  'A-684': 'https://drs.faa.gov/browse/excelExternalWindow/00900B34D67162AA862581EF0060CBBF.0001',
  'A19SW': 'https://drs.faa.gov/browse/excelExternalWindow/AC332AD5CE2639AE8625856E006048BA.0001',
  'P6NE': 'https://drs.faa.gov/browse/excelExternalWindow/460300476FDCBDC88625729F006C2802.0001',
  'H4NM': 'https://drs.faa.gov/browse/excelExternalWindow/00ABB6F558F0A642862586B700704EC0.0001',
  'E3GL': 'https://drs.faa.gov/browse/excelExternalWindow/AC49FCB970D466AE862586CE005B4BC0.0001',
  'P41EA': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID122358187620250404133130.0001',
  'A00073CE': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID162442222620250318142854.0001',
  '4A20': 'https://drs.faa.gov/browse/excelExternalWindow/00B5872A808175A88525673E00645DDA.0001',
  'P28EA': 'https://drs.faa.gov/browse/excelExternalWindow/00B59BF7FF22A0E986257DEF006FC287.0001',
  'ATC 201': 'https://drs.faa.gov/browse/excelExternalWindow/00B9E706BF9EBF518525673E00684658.0001',
  'A28NM': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID167280873920251205175601.0001',
  'P27EA': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID164052437020250403142746.0001',
  'A00007SE': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID128562299920251125193447.0001',
  'R00004RC': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID131628022620250430185304.0001',
};

const getTcdsPdfUrl = (tcdsNumber: string): string => {
  const directUrl = tcdsDirectUrls[tcdsNumber];
  if (directUrl) {
    return directUrl;
  }
  // Fallback to browse page
  return `https://drs.faa.gov/browse`;
};

// Remove the form submission function since it's not working
const handleTcdsSearch = (tcdsNumber: string) => {
  window.open(getTcdsPdfUrl(tcdsNumber), '_blank');
};

interface CertificationData {
  'TCDS Number': string;
  'TC Holder': string;
  'Status': string;
  'Office of Primary Responsibility': string;
  'Former TC Holders': string;
  'Model': string;
  'Product Type': string;
  'Product Subtype': string;
  'Revision Number': string;
}

const columnHelper = createColumnHelper<CertificationData>();

const columns = [
  columnHelper.accessor('TCDS Number', {
    header: 'TCDS Number',
    cell: info => (
      <button
        onClick={() => handleTcdsSearch(info.getValue())}
        className="font-mono text-blue-600 font-semibold hover:text-blue-800 hover:underline cursor-pointer transition-colors bg-transparent border-none p-0"
        title={`Search for TCDS ${info.getValue()} on FAA DRS`}
      >
        {info.getValue()} 📄
      </button>
    ),
  }),
  columnHelper.accessor('TC Holder', {
    header: 'TC Holder',
    cell: info => (
      <span className="text-gray-900 font-medium">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('Status', {
    header: 'Status',
    cell: info => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        info.getValue() === 'Current' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('Model', {
    header: 'Model',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('Product Type', {
    header: 'Product Type',
    cell: info => (
      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('Product Subtype', {
    header: 'Subtype',
    cell: info => info.getValue() || '-',
  }),
  columnHelper.accessor('Revision Number', {
    header: 'Rev',
    cell: info => info.getValue(),
  }),
];

export default function CertificationTable() {
  const [data, setData] = useState<CertificationData[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/Aircraft Project/Dataset1.csv');
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        
        const parsedData = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header.trim()] = values[index]?.trim() || '';
          });
          return obj;
        });
        
        setData(parsedData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search certifications..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            Showing {table.getRowModel().rows.length} of {data.length} records
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        <span className="text-gray-400">
                          {{
                            asc: '↑',
                            desc: '↓',
                          }[header.column.getIsSorted() as string] ?? '↕'}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page {table.getState().pagination.pageIndex + 1} of{' '}
                {table.getPageCount()}
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ««
                </button>
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  «
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  »
                </button>
                <button
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  »»
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}