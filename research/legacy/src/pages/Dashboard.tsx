import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { useForm } from 'react-hook-form'
import { useMemo } from 'react'
import { useReactTable, getCoreRowModel, ColumnDef } from '@tanstack/react-table'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

type FormData = {
  name: string
  email: string
}

const sampleChartData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      label: 'Visitors',
      data: [12, 19, 8, 14, 18, 10, 22],
      borderColor: 'rgb(34,197,94)',
      backgroundColor: 'rgba(34,197,94,0.25)'
    }
  ]
}

const sampleTableData = [
  { id: 1, name: 'Alice', role: 'Admin' },
  { id: 2, name: 'Bob', role: 'Editor' },
  { id: 3, name: 'Clara', role: 'Viewer' }
]

export default function Dashboard() {
  const { register, handleSubmit, reset } = useForm<FormData>()

  const onSubmit = (data: FormData) => {
    alert(JSON.stringify(data))
    reset()
  }

  const columns = useMemo<ColumnDef<typeof sampleTableData[number]>[]>(
    () => [
      { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'role', header: 'Role' }
    ],
    []
  )

  const table = useReactTable({ data: sampleTableData, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="space-y-6">
      <section className="bg-white border rounded p-4">
        <h2 className="text-lg font-semibold mb-2">Visitors (Chart)</h2>
        <div style={{ maxWidth: 700 }}>
          <Line data={sampleChartData} />
        </div>
      </section>

      <section className="bg-white border rounded p-4">
        <h2 className="text-lg font-semibold mb-2">Users (Table)</h2>
        <table className="min-w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="text-left p-2 border-b">{header.isPlaceholder ? null : header.renderHeader?.()}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="p-2 border-b">{cell.renderCell?.()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white border rounded p-4 max-w-md">
        <h2 className="text-lg font-semibold mb-2">Contact (Form)</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input {...register('name', { required: true })} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input {...register('email', { required: true })} className="w-full border p-2 rounded" />
          </div>
          <div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
          </div>
        </form>
      </section>
    </div>
  )
}
