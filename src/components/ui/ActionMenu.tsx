import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Icon } from './Icon';
import type { IconName } from '~/icons';
import './ActionMenu.css';

export interface ActionMenuItem {
  icon?: IconName;
  label: ReactNode;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

interface Props {
  items: ActionMenuItem[];
  triggerLabel: string;
  triggerClassName?: string;
  align?: 'left' | 'right';
}

export function ActionMenu({
  items,
  triggerLabel,
  triggerClassName,
  align = 'right',
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: Event) {
      const target = e.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function handleItem(e: MouseEvent, item: ActionMenuItem) {
    e.stopPropagation();
    if (item.disabled) return;
    setOpen(false);
    item.onSelect();
  }

  return (
    <div className="action-menu" ref={rootRef}>
      <button
        type="button"
        className={['action-menu-trigger', triggerClassName].filter(Boolean).join(' ')}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        title={triggerLabel}
      >
        <Icon name="three-dots-vertical" size={16} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`action-menu-panel action-menu-panel-${align}`}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              role="menuitem"
              className={[
                'action-menu-item',
                item.tone === 'danger' ? 'action-menu-item-danger' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={(e) => handleItem(e, item)}
              disabled={item.disabled}
            >
              {item.icon ? (
                <Icon name={item.icon} size={13} className="action-menu-item-icon" />
              ) : null}
              <span className="action-menu-item-label">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
