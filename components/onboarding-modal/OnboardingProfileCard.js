import React from 'react';
import PropTypes from 'prop-types';
import { Flex, Box } from '@rebass/grid';
import styled, { css } from 'styled-components';
import { FormattedMessage } from 'react-intl';

import Avatar from '../../components/Avatar';
import StyledTag from '../../components/StyledTag';
import StyledTooltip from '../../components/StyledTooltip';

const Admin = styled(StyledTag)`
  font-size: 14px;
  border-top-right-radius: 50px;
  border-bottom-right-radius: 50px;

  ${tag =>
    tag.noOverlay &&
    css`
      display: none;
    `}
`;

class OnboardingProfileCard extends React.Component {
  static propTypes = {
    collective: PropTypes.object,
  };

  render() {
    const { collective } = this.props;
    const { name } = collective;

    return (
      <Flex my={1} ml={2}>
        <StyledTooltip
          content={<FormattedMessage id="onboarding.admins.pending" defaultMessage="Pending for approval" />}
        >
          <Admin
            textTransform="none"
            display="flex"
            alignItems="center"
            closeButtonProps={{
              onClick: () => console.log('yooooooo'),
              onMouseEnter: () => console.log('heeeeey'),
              closeButtonWidth: '20px',
              closeButtonHeight: '20px',
              closeButtonColor: 'black',
              closeButtonBackground: 'rgba(0, 0, 155, 1.0)',
              closeButtonDisplay: 'flex',
              closeButtonAlign: 'center',
            }}
          >
            <Flex alignItems="center">
              <Avatar radius={15} collective={collective} />
              <Box fontSize="Caption" ml={2}>
                {name}
              </Box>
            </Flex>
          </Admin>
        </StyledTooltip>
      </Flex>
    );
  }
}

export default OnboardingProfileCard;
