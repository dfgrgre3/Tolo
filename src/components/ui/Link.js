import React from 'react';
import PropTypes from 'prop-types';
import NextLink from 'next/link';

const Link = ({ children, href, className, onClick, ...props }) => {
  return (
    <NextLink href={href} className={className} onClick={onClick} {...props}>
      {children}
    </NextLink>
  );
};

Link.propTypes = {
  children: PropTypes.node.isRequired,
  href: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  className: PropTypes.string,
  onClick: PropTypes.func,
};

Link.defaultProps = {
  className: '',
  onClick: undefined,
};

Link.displayName = 'Link';

export default Link;
