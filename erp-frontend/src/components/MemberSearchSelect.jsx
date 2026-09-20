import { useState, useEffect, useRef, useCallback } from 'react';
import { membersAPI } from '../api/gym/members';

function memberLabel(member) {
  const name = member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim();
  return `${name} — ${member.member_code || ''}`;
}

export default function MemberSearchSelect({
  value,
  onChange,
  onMemberSelect,
  placeholder = 'Search member by name or ID...',
  required = false,
  disabled = false,
  error = '',
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  const loadMember = useCallback(async (memberId) => {
    if (!memberId) {
      setSelectedMember(null);
      setQuery('');
      return;
    }
    try {
      const { data } = await membersAPI.getById(memberId);
      setSelectedMember(data);
      setQuery(memberLabel(data));
    } catch {
      setSelectedMember(null);
      setQuery('');
    }
  }, []);

  useEffect(() => {
    loadMember(value);
  }, [value, loadMember]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchMembers = (term) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const trimmed = term.trim();
      if (!trimmed) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await membersAPI.getAll({ search: trimmed, page_size: 20 });
        setResults(data?.items || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  };

  const handleInputChange = (e) => {
    const term = e.target.value;
    setQuery(term);
    setOpen(true);
    setSelectedMember(null);
    onChange?.('');
    onMemberSelect?.(null);
    searchMembers(term);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropUp(window.innerHeight - rect.bottom < 260 && rect.top > 260);
    }
  };

  const handleSelect = (member) => {
    setSelectedMember(member);
    setQuery(memberLabel(member));
    setOpen(false);
    onChange?.(member.id);
    onMemberSelect?.(member);
  };

  const handleFocus = () => {
    setOpen(true);
    if (query.trim()) searchMembers(query);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropUp(window.innerHeight - rect.bottom < 260 && rect.top > 260);
    }
  };

  return (
    <div ref={containerRef} className="member-search-select" style={{ position: 'relative' }}>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
        Member {required && <span style={{ color: 'var(--primary)' }}>*</span>}
      </label>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="member-search-input"
        style={{
          width: '100%',
          padding: '0.65rem 0.85rem',
          borderRadius: 8,
          border: `1px solid ${error ? 'rgba(239,68,68,0.6)' : open ? 'var(--primary)' : 'rgba(234,179,8,0.25)'}`,
          background: '#1a1a1a',
          color: '#f5f5f5',
          outline: 'none',
          boxShadow: open ? '0 0 0 2px rgba(234,179,8,0.15)' : 'none',
        }}
      />

      {selectedMember && (
        <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Member ID: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{selectedMember.member_code}</span>
          {selectedMember.phone ? ` · Phone: ${selectedMember.phone}` : ''}
        </div>
      )}

      {error && (
        <div style={{ color: '#fca5a5', fontSize: '0.78rem', marginTop: '0.35rem' }}>{error}</div>
      )}

      {open && (query.trim() || loading) && (
        <div
          className="member-search-dropdown"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            ...(dropUp ? { bottom: '100%', marginBottom: 4 } : { top: '100%', marginTop: 4 }),
            background: '#141414',
            border: '1px solid rgba(234,179,8,0.35)',
            borderRadius: 10,
            maxHeight: 240,
            overflowY: 'auto',
            zIndex: 60,
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
          }}
        >
          {loading && (
            <div style={{ padding: '0.85rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Searching members...
            </div>
          )}

          {!loading && results.length === 0 && query.trim() && (
            <div style={{ padding: '0.85rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No members found
            </div>
          )}

          {!loading && results.map((member) => {
            const name = member.full_name || `${member.first_name} ${member.last_name}`;
            const isSelected = selectedMember?.id === member.id;
            return (
              <button
                key={member.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(member)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem 0.9rem',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: isSelected ? 'rgba(234,179,8,0.12)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.9rem' }}>{name}</div>
                <div style={{ color: 'var(--primary)', fontSize: '0.78rem', marginTop: 2 }}>
                  Member ID: {member.member_code || '—'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: 2 }}>
                  Phone: {member.phone || '—'}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
