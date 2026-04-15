import React, { useState, useEffect } from 'react';
import api from '../services/authService';
import toast from 'react-hot-toast';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface Table {
  name: string;
  rowCount: number;
}

interface SchemaColumn {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
  is_primary_key: boolean;
}

interface TableRow {
  [key: string]: any;
}

const AdminDatabase: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [schema, setSchema] = useState<SchemaColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRow, setEditingRow] = useState<TableRow | null>(null);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{rowId: number, tableName: string} | null>(null);

  const rowsPerPage = 10;

  // Fetch table list
  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await api.get('/admin/db/tables');
      setTables(response.data.tables);
      if (response.data.tables.length > 0 && !selectedTable) {
        setSelectedTable(response.data.tables[0].name);
      }
    } catch (error: any) {
      toast.error('Failed to fetch tables');
      console.error(error);
    }
  };

  // Fetch table data and schema
  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
      fetchTableSchema();
    }
  }, [selectedTable, currentPage, searchTerm]);

  const fetchTableData = async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const response = await api.get(`/admin/db/tables/${selectedTable}`, {
        params: {
          page: currentPage,
          limit: rowsPerPage,
          search: searchTerm
        }
      });
      setRows(response.data.rows);
      setTotalCount(response.data.totalCount);
    } catch (error: any) {
      toast.error('Failed to fetch table data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableSchema = async () => {
    if (!selectedTable) return;
    try {
      const response = await api.get(`/admin/db/tables/${selectedTable}/schema`);
      setSchema(response.data.schema);
    } catch (error: any) {
      toast.error('Failed to fetch table schema');
      console.error(error);
    }
  };

  const handleAddRow = () => {
    setEditingRow({});
    setIsAddingRow(true);
    setShowModal(true);
  };

  const handleEditRow = (row: TableRow) => {
    setEditingRow({ ...row });
    setIsAddingRow(false);
    setShowModal(true);
  };

  const handleSaveRow = async () => {
    if (!selectedTable || !editingRow) return;

    try {
      if (isAddingRow) {
        await api.post(`/admin/db/tables/${selectedTable}`, editingRow);
        toast.success('Row added successfully');
      } else {
        const id = editingRow.id;
        const dataToUpdate = { ...editingRow };
        delete dataToUpdate.id;
        await api.put(`/admin/db/tables/${selectedTable}/${id}`, dataToUpdate);
        toast.success('Row updated successfully');
      }
      setShowModal(false);
      setEditingRow(null);
      setCurrentPage(1);
      fetchTableData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save row');
      console.error(error);
    }
  };

  const handleDeleteRow = async (rowId: number) => {
    if (!selectedTable) return;
    try {
      await api.delete(`/admin/db/tables/${selectedTable}/${rowId}`);
      toast.success('Row deleted successfully');
      setDeleteConfirm(null);
      fetchTableData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete row');
      console.error(error);
    }
  };

  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const currentTableInfo = tables.find(t => t.name === selectedTable);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Database Manager</h1>
          <p className="page-subtitle">Browse and manage database tables</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 20 }}>

        {/* Left Sidebar - Table List */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <h3>Tables</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '60vh',
              overflowY: 'auto'
            }}>
              {tables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => {
                    setSelectedTable(table.name);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    background: selectedTable === table.name ? 'var(--color-primary)' : 'transparent',
                    color: selectedTable === table.name ? 'white' : 'var(--text-color)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderBottom: '1px solid var(--gray-200)',
                    fontSize: '14px',
                    fontWeight: selectedTable === table.name ? 600 : 500,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTable !== table.name) {
                      (e.target as HTMLButtonElement).style.background = 'var(--gray-100)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTable !== table.name) {
                      (e.target as HTMLButtonElement).style.background = 'transparent';
                    }
                  }}
                >
                  <span>{table.name}</span>
                  <span style={{
                    background: 'var(--gray-300)',
                    color: 'var(--text-color)',
                    borderRadius: '12px',
                    padding: '2px 6px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {table.rowCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Table Data */}
        <div className="card">
          {selectedTable && (
            <>
              <div className="card-header">
                <div style={{ flex: 1 }}>
                  <h3 style={{ textTransform: 'capitalize', marginBottom: 4 }}>
                    {selectedTable}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                    Total rows: {totalCount}
                  </p>
                </div>
              </div>

              <div className="card-body">
                {/* Search and Add Button */}
                <div style={{
                  display: 'flex',
                  gap: 12,
                  marginBottom: 16,
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <MagnifyingGlassIcon style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 18,
                      height: 18,
                      color: 'var(--gray-400)'
                    }} />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{
                        width: '100%',
                        paddingLeft: 36,
                        paddingRight: 12,
                        paddingTop: 8,
                        paddingBottom: 8,
                        border: '1px solid var(--gray-300)',
                        borderRadius: 6,
                        fontSize: 14
                      }}
                    />
                  </div>
                  <button
                    onClick={handleAddRow}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      background: 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600
                    }}
                  >
                    <PlusIcon style={{ width: 18, height: 18 }} />
                    Add Row
                  </button>
                </div>

                {/* Table */}
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--gray-300)' }}>
                            {schema.map((col) => (
                              <th
                                key={col.column_name}
                                style={{
                                  padding: '12px 8px',
                                  textAlign: 'left',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: 'var(--gray-700)',
                                  background: 'var(--gray-50)'
                                }}
                              >
                                {col.column_name}
                              </th>
                            ))}
                            <th style={{
                              padding: '12px 8px',
                              textAlign: 'center',
                              fontSize: 12,
                              fontWeight: 600,
                              background: 'var(--gray-50)'
                            }}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, idx) => (
                            <tr
                              key={idx}
                              style={{
                                borderBottom: '1px solid var(--gray-200)',
                                background: idx % 2 === 0 ? 'white' : 'var(--gray-50)',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget).style.background = 'var(--gray-100)';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget).style.background = idx % 2 === 0 ? 'white' : 'var(--gray-50)';
                              }}
                            >
                              {schema.map((col) => (
                                <td
                                  key={col.column_name}
                                  style={{
                                    padding: '12px 8px',
                                    fontSize: 13,
                                    color: 'var(--text-color)',
                                    maxWidth: 200,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title={String(row[col.column_name])}
                                >
                                  {col.data_type.includes('timestamp') || col.data_type === 'date'
                                    ? new Date(row[col.column_name]).toLocaleDateString()
                                    : String(row[col.column_name] ?? '')}
                                </td>
                              ))}
                              <td style={{
                                padding: '12px 8px',
                                textAlign: 'center',
                                display: 'flex',
                                gap: 8,
                                justifyContent: 'center'
                              }}>
                                <button
                                  onClick={() => handleEditRow(row)}
                                  style={{
                                    padding: 6,
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <PencilIcon style={{ width: 16, height: 16 }} />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ rowId: row.id, tableName: selectedTable })}
                                  style={{
                                    padding: 6,
                                    background: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <TrashIcon style={{ width: 16, height: 16 }} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 8,
                        marginTop: 20,
                        paddingTop: 16,
                        borderTop: '1px solid var(--gray-200)'
                      }}>
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid var(--gray-300)',
                            borderRadius: 4,
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            opacity: currentPage === 1 ? 0.5 : 1
                          }}
                        >
                          Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            style={{
                              padding: '6px 10px',
                              border: page === currentPage ? '1px solid var(--color-primary)' : '1px solid var(--gray-300)',
                              background: page === currentPage ? 'var(--color-primary)' : 'white',
                              color: page === currentPage ? 'white' : 'var(--text-color)',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontWeight: page === currentPage ? 600 : 400
                            }}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid var(--gray-300)',
                            borderRadius: 4,
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            opacity: currentPage === totalPages ? 0.5 : 1
                          }}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal for Add/Edit Row */}
      {showModal && editingRow && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 24,
            maxWidth: 600,
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginBottom: 16 }}>
              {isAddingRow ? 'Add New Row' : `Edit ${selectedTable}`}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {schema.filter(col => col.column_name !== 'id').map((col) => (
                <div key={col.column_name}>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 4,
                    color: 'var(--gray-700)'
                  }}>
                    {col.column_name}
                  </label>
                  <input
                    type={col.data_type.includes('timestamp') ? 'datetime-local' :
                           col.data_type === 'date' ? 'date' :
                           col.data_type.includes('NUMERIC') || col.data_type === 'integer' ? 'number' : 'text'}
                    value={editingRow[col.column_name] ?? ''}
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      [col.column_name]: e.target.value
                    })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--gray-300)',
                      borderRadius: 6,
                      fontSize: 14
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingRow(null);
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--gray-300)',
                  background: 'white',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRow}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 24,
            maxWidth: 400
          }}>
            <h2 style={{ marginBottom: 8 }}>Confirm Delete</h2>
            <p style={{ color: 'var(--gray-600)', marginBottom: 20 }}>
              Are you sure you want to delete row #{deleteConfirm.rowId}? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--gray-300)',
                  background: 'white',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRow(deleteConfirm.rowId)}
                style={{
                  padding: '8px 16px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDatabase;
