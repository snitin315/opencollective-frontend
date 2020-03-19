import React from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';

import OnboardingModal from '../components/onboarding-modal/OnboardingModal';
import ErrorPage from '../components/ErrorPage';
import { withUser } from '../components/UserProvider';
import AuthenticatedPage from '../components/AuthenticatedPage';
import { getCollectivePageQuery } from '../components/collective-page/graphql/queries';

class NewCollectiveOnboardingPage extends React.Component {
  static async getInitialProps({ query }) {
    return {
      slug: query && query.slug,
      query,
    };
  }

  static propTypes = {
    query: PropTypes.object,
    slug: PropTypes.string, // for addCollectiveCoverData
    data: PropTypes.object, // from withData
    loadingLoggedInUser: PropTypes.bool,
    LoggedInUser: PropTypes.object,
  };

  constructor(props) {
    super(props);

    this.state = {
      show: true,
    };
  }

  setShow = bool => {
    this.setState({ show: bool });
  };

  render() {
    const { data, LoggedInUser, query } = this.props;
    const { show } = this.state;
    const collective = data && data.Collective;

    if (data.error) {
      return <ErrorPage data={data} />;
    }

    return (
      <AuthenticatedPage>
        <OnboardingModal
          show={show}
          setShow={this.setShow}
          query={query}
          collective={collective}
          LoggedInUser={LoggedInUser}
        />
      </AuthenticatedPage>
    );
  }
}

const getCollective = graphql(getCollectivePageQuery, {
  options: props => ({
    variables: {
      slug: props.slug,
    },
  }),
});

export default withUser(getCollective(NewCollectiveOnboardingPage));
